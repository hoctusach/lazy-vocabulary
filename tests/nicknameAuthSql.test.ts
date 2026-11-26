/**
 * @vitest-environment node
 *
 * Runs the real Supabase SQL (supabase/sql) on an in-memory Postgres to test the login check.
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const sql = (file: string) => readFileSync(`supabase/sql/${file}`, 'utf8');

let db: PGlite;
const verify = async (nickname: string, passcode: number) =>
  (await db.query<{ user_unique_key: string }>('select * from public.verify_nickname_passcode($1, $2)', [
    nickname,
    passcode,
  ])).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated;');
  await db.exec(`create table public.nicknames (
    id bigserial primary key,
    created_at timestamptz default now(),
    name text not null,
    passcode int8,
    user_unique_key text not null unique
  );`);
  await db.exec(sql('2025-05-nickname-passcode.sql'));
  await db.exec(sql('2026-11-fix-verify-nickname-passcode.sql'));
  await db.exec(`insert into public.nicknames (name, passcode, user_unique_key) values
    ('Mi mi U', 123456, 'mimiu'),
    ('No Code', null, 'nocode');`);
});

describe('verify_nickname_passcode (login check)', () => {
  it('accepts the right passcode', async () => {
    expect(await verify('Mi mi U', 123456)).toEqual([{ user_unique_key: 'mimiu' }]);
  });

  it('rejects a wrong passcode', async () => {
    expect(await verify('Mi mi U', 999999)).toEqual([]);
    expect(await verify('Mi mi U', 0)).toEqual([]);
  });

  it('matches the nickname ignoring case and spaces', async () => {
    expect(await verify('MIMIU', 123456)).toEqual([{ user_unique_key: 'mimiu' }]);
    expect(await verify('  mi  mi u ', 123456)).toEqual([{ user_unique_key: 'mimiu' }]);
    expect(await verify('MIMIU', 999999)).toEqual([]);
  });

  it('rejects an unknown nickname', async () => {
    expect(await verify('nobody', 123456)).toEqual([]);
  });

  it('never matches a profile that has no passcode', async () => {
    expect(await verify('No Code', 123456)).toEqual([]);
  });

  it('keeps one profile per canonical nickname', async () => {
    await expect(
      db.exec(`insert into public.nicknames (name, passcode, user_unique_key) values ('MIMIU', 1, 'mimiu')`)
    ).rejects.toThrow();
  });
});
