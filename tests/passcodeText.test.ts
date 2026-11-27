/**
 * @vitest-environment node
 * Passcode stored as typed (text): SQL migration 2026-11-passcode-as-text.sql, run on an in-memory Postgres (A8).
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(`supabase/sql/${file}`, 'utf8');

const CANON = `
create function public.canon(s text) returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(s, ''), '\\s+', '', 'g'));
$$;
`;

async function database(extraSql = '') {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(`create table public.nicknames (
    id bigserial primary key, created_at timestamptz default now(), name text not null,
    passcode bigint, timezone text, user_unique_key text not null unique);`);
  await db.exec(CANON);
  await db.exec(read('2026-11-live-auth-functions-snapshot.sql'));
  await db.exec(read('2026-11-fix-upsert-or-verify-profile.sql'));
  // Legacy data: "012345" was saved as 12345 (leading zero lost); "123456" is a normal one.
  await db.exec(`insert into public.nicknames (name, passcode, user_unique_key, timezone) values
    ('Legacy Zero', 12345, 'legacyzero', null),
    ('Plain One', 123456, 'plainone', null),
    ('No Code', null, 'nocode', null);`);
  if (extraSql) await db.exec(extraSql);
  await db.exec(read('2026-11-passcode-as-text.sql'));
  return db;
}

let db: PGlite;
beforeAll(async () => {
  db = await database();
});

const verify = async (name: string, passcode: string) =>
  (await db.query('select * from public.verify_nickname_passcode($1, $2)', [name, passcode])).rows;
const upsert = (key: string, name: string, passcode: string) =>
  db.query<{ user_unique_key: string }>('select * from public.upsert_or_verify_profile($1, $2, $3, null)', [key, name, passcode]);
const stored = async (key: string) =>
  (await db.query<{ passcode: string }>('select passcode from public.nicknames where user_unique_key = $1', [key])).rows[0]?.passcode;

describe('the column and the functions', () => {
  it('the passcode column is text', async () => {
    const { rows } = await db.query<{ data_type: string }>(
      `select data_type from information_schema.columns where table_name = 'nicknames' and column_name = 'passcode'`
    );
    expect(rows[0].data_type).toBe('text');
  });

  it('existing passcodes are kept as text', async () => {
    expect(await stored('plainone')).toBe('123456');
  });

  it('only the service role can call the login functions', async () => {
    const can = async (role: string, fn: string) =>
      (await db.query<{ ok: boolean }>('select has_function_privilege($1, $2, $3) as ok', [role, fn, 'execute'])).rows[0].ok;
    for (const fn of [
      'public.upsert_or_verify_profile(text, text, text, text)',
      'public.verify_nickname_passcode(text, text)',
      'public.set_nickname_passcode(text, text)',
    ]) {
      expect(await can('anon', fn)).toBe(false);
      expect(await can('service_role', fn)).toBe(true);
    }
  });
});

describe('passcodes are stored exactly as typed (A8)', () => {
  it('"0123" and "00123" are two different passcodes', async () => {
    await upsert('zero1', 'Zero One', '0123');
    await upsert('zero2', 'Zero Two', '00123');
    expect(await stored('zero1')).toBe('0123');
    expect(await stored('zero2')).toBe('00123');
    expect(await verify('Zero One', '0123')).toHaveLength(1);
    expect(await verify('Zero One', '00123')).toEqual([]);
    expect(await verify('Zero Two', '00123')).toHaveLength(1);
    expect(await verify('Zero Two', '0123')).toEqual([]);
  });

  it('a new nickname with a passcode starting with 0 can sign in again', async () => {
    await upsert('zero3', 'Zero Three', '0000');
    expect(await verify('zero three', '0000')).toHaveLength(1);
    expect(await verify('zero three', '000')).toEqual([]);
    expect(await verify('zero three', '00000')).toEqual([]);
  });

  it('creating the same nickname with another passcode is refused', async () => {
    await upsert('zero4', 'Zero Four', '0123');
    await expect(upsert('zero4', 'Zero Four', '00123')).rejects.toThrow(/nickname_already_exists/);
    await expect(upsert('zero4', 'Zero Four', '123456')).rejects.toThrow(/nickname_already_exists/);
    expect(await stored('zero4')).toBe('0123');
  });

  it('the same nickname with the same passcode acts like sign in', async () => {
    const { rows } = await upsert('zero4', 'Zero Four', '0123');
    expect(rows[0].user_unique_key).toBe('zero4');
  });
});

describe('users who already had a passcode keep working', () => {
  it('a passcode that lost its zero (typed 012345, saved 12345) still signs in', async () => {
    expect(await verify('Legacy Zero', '012345')).toHaveLength(1);
    expect(await verify('Legacy Zero', '12345')).toHaveLength(1);
  });

  it('after one sign in the typed form is saved and the shortcut stops applying to them', async () => {
    await upsert('legacyzero', 'Legacy Zero', '012345');
    expect(await stored('legacyzero')).toBe('012345');
    expect(await verify('Legacy Zero', '012345')).toHaveLength(1);
    expect(await verify('Legacy Zero', '12345')).toEqual([]);
  });

  it('a normal passcode is unaffected, and a wrong one is still refused', async () => {
    expect(await verify('Plain One', '123456')).toHaveLength(1);
    expect(await verify('Plain One', '654321')).toEqual([]);
    expect(await verify('Plain One', '023456')).toEqual([]);
  });

  it('a profile without a passcode gets the first one that is typed', async () => {
    await upsert('nocode', 'No Code', '0555');
    expect(await stored('nocode')).toBe('0555');
    await expect(upsert('nocode', 'No Code', '0556')).rejects.toThrow(/nickname_already_exists/);
  });

  it('a wrong passcode never signs in, and an unknown nickname either', async () => {
    expect(await verify('Plain One', '')).toEqual([]);
    expect(await verify('nobody', '123456')).toEqual([]);
  });
});

describe('the safety stop', () => {
  it('refuses to run when another function still uses the passcode column', async () => {
    const extra = `create function public.get_or_create_share_token(p_nickname text, p_passcode bigint) returns text language sql as $$
      select 'x' from public.nicknames n where n.passcode = p_passcode limit 1; $$;`;
    await expect(database(extra)).rejects.toThrow(/get_or_create_share_token/);
  });
});
