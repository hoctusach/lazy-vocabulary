/**
 * @vitest-environment node
 *
 * Runs the real Supabase auth SQL on an in-memory Postgres. The "production" functions below are the
 * definitions that were live in Supabase on 2026-11-26; the migration under test replaces
 * upsert_or_verify_profile and locks down who may call the auth functions.
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const PRODUCTION = `
create function public.canon(s text) returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(s, ''), '\\s+', '', 'g'));
$$;

create function public.verify_nickname_passcode(nickname text, passcode bigint)
returns table(user_unique_key text) language sql security definer
set search_path to 'public', 'pg_temp' as $$
  select n.user_unique_key
  from public.nicknames n
  where canon(n.name) = canon(verify_nickname_passcode.nickname)
    and n.passcode::text = verify_nickname_passcode.passcode::text
  limit 1;
$$;

create function public.set_nickname_passcode(nickname text, passcode bigint)
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  update public.nicknames set passcode = passcode
  where user_unique_key = lower(replace(nickname,' ',''));
$$;

-- The original (vulnerable) version.
create function public.upsert_or_verify_profile(p_user_unique_key text, p_nickname text, p_passcode bigint, p_timezone text default null)
returns table(user_unique_key text, nickname text, timezone text) language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
begin
  update public.nicknames n set name = p_nickname, passcode = p_passcode, timezone = coalesce(p_timezone, n.timezone)
  where n.user_unique_key = p_user_unique_key
  returning n.user_unique_key, n.name, n.timezone into user_unique_key, nickname, timezone;
  if found then return next; return; end if;
  insert into public.nicknames(user_unique_key, name, passcode, timezone)
  values (p_user_unique_key, p_nickname, p_passcode, p_timezone)
  returning nicknames.user_unique_key, nicknames.name, nicknames.timezone into user_unique_key, nickname, timezone;
  return next;
end;
$$;
`;

const MIGRATION = readFileSync('supabase/sql/2026-11-fix-upsert-or-verify-profile.sql', 'utf8');

async function freshDb(applyFix: boolean) {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(`create table public.nicknames (
    id bigserial primary key,
    created_at timestamptz default now(),
    name text not null,
    passcode bigint,
    timezone text,
    user_unique_key text not null unique
  );`);
  await db.exec(PRODUCTION);
  await db.exec(
    `insert into public.nicknames (name, passcode, user_unique_key, timezone) values
       ('Mi mi U', 123456, 'mimiu', 'Asia/Bangkok'),
       ('Old Profile', null, 'oldprofile', null);`
  );
  if (applyFix) await db.exec(MIGRATION);
  return db;
}

const upsert = (db: PGlite, key: string, name: string, passcode: number, tz: string | null = null) =>
  db.query<{ user_unique_key: string; nickname: string; timezone: string | null }>(
    'select * from public.upsert_or_verify_profile($1, $2, $3, $4)',
    [key, name, passcode, tz]
  );
const verify = async (db: PGlite, name: string, passcode: number) =>
  (await db.query('select * from public.verify_nickname_passcode($1, $2)', [name, passcode])).rows;

describe('the vulnerability (before the migration)', () => {
  it('creating a profile with an existing nickname overwrites its passcode', async () => {
    const db = await freshDb(false);
    await upsert(db, 'mimiu', 'Mi mi U', 777777);
    expect(await verify(db, 'mimiu', 123456)).toEqual([]); // the real owner is locked out
    expect(await verify(db, 'mimiu', 777777)).toHaveLength(1); // the attacker is in
  });
});

describe('upsert_or_verify_profile after the migration', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb(true);
  });

  it('creates a new profile', async () => {
    const { rows } = await upsert(db, 'newuser', 'New User', 424242, 'Asia/Ho_Chi_Minh');
    expect(rows).toEqual([{ user_unique_key: 'newuser', nickname: 'New User', timezone: 'Asia/Ho_Chi_Minh' }]);
    expect(await verify(db, 'new user', 424242)).toHaveLength(1);
  });

  it('lets the owner through with the same passcode and refreshes the timezone', async () => {
    const { rows } = await upsert(db, 'mimiu', 'MIMIU', 123456, 'Asia/Ho_Chi_Minh');
    expect(rows[0]).toMatchObject({ user_unique_key: 'mimiu', nickname: 'Mi mi U', timezone: 'Asia/Ho_Chi_Minh' });
  });

  it('refuses an existing nickname with a different passcode and keeps the old passcode', async () => {
    await expect(upsert(db, 'mimiu', 'Mi mi U', 777777)).rejects.toThrow(/nickname_already_exists/);
    expect(await verify(db, 'Mi mi U', 123456)).toHaveLength(1);
    expect(await verify(db, 'Mi mi U', 777777)).toEqual([]);
  });

  it('does not change the stored display name', async () => {
    const { rows } = await upsert(db, 'mimiu', 'something else', 123456);
    expect(rows[0].nickname).toBe('Mi mi U');
  });

  it('lets the first caller set a passcode on a profile that has none', async () => {
    await upsert(db, 'oldprofile', 'Old Profile', 555555);
    expect(await verify(db, 'old profile', 555555)).toHaveLength(1);
    await expect(upsert(db, 'oldprofile', 'Old Profile', 666666)).rejects.toThrow(/nickname_already_exists/);
  });

  it('rejects a wrong passcode at login', async () => {
    expect(await verify(db, 'mimiu', 999999)).toEqual([]);
    expect(await verify(db, 'nobody', 123456)).toEqual([]);
  });

  it('only the service role may call the auth functions', async () => {
    const can = async (role: string, fn: string) =>
      (await db.query<{ ok: boolean }>('select has_function_privilege($1, $2, $3) as ok', [role, fn, 'execute']))
        .rows[0].ok;
    for (const fn of [
      'public.upsert_or_verify_profile(text, text, bigint, text)',
      'public.set_nickname_passcode(text, bigint)',
      'public.verify_nickname_passcode(text, bigint)',
    ]) {
      expect(await can('anon', fn)).toBe(false);
      expect(await can('authenticated', fn)).toBe(false);
      expect(await can('service_role', fn)).toBe(true);
    }
  });
});
