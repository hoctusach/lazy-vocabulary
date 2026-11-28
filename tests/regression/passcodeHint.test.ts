/**
 * @vitest-environment node
 * [FB-77] Optional passcode hint: validation rules, the three Edge Functions (fake Deno + fake admin client)
 * and the draft SQL migration (run on an in-memory Postgres). Nothing here touches the live Supabase project.
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hintContainsPasscode, normalizeHint, PASSCODE_HINT_MAX, validatePasscodeHint } from '../../src/lib/auth/passcodeHint';

type Handler = (req: Request) => Promise<Response>;

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  tables: {} as Record<string, unknown>,
  tableError: null as unknown,
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2.48.0', () => ({
  createClient: () => ({
    rpc: (name: string, args: unknown) => db.rpc(name, args),
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.tables[table] ?? null, error: db.tableError }) }) }),
    }),
  }),
}));

async function load(path: string): Promise<Handler> {
  let handler: Handler | undefined;
  (globalThis as unknown as { Deno: unknown }).Deno = {
    serve: (h: Handler) => {
      handler = h;
    },
    env: { get: (k: string) => ({ SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'key' } as Record<string, string>)[k] },
  };
  vi.resetModules();
  await import(/* @vite-ignore */ path);
  if (!handler) throw new Error('handler not registered');
  return handler;
}
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://x/fn', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const out = async (res: Response) => ({ status: res.status, body: await res.json() });

// Cases both the client helper and the Edge Function copy must agree on.
const CONTAINS: Array<[string, string, boolean]> = [
  ['my code is 123456', '123456', true],
  ['123456', '123456', true],
  ['12 34-56', '123456', true],
  ['1-2-3-4', '1234', true],
  ['PIN: 1234', '1234', true],
  ['my dog and my birthday', '123456', false],
  ['born in 1988', '1234', false],
  ['12 3', '1234', false],
];

beforeEach(() => {
  db.rpc.mockReset();
  db.tables = {};
  db.tableError = null;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('[FB-77] hint validation (client helper)', () => {
  it.each(CONTAINS)('contains-passcode %j vs %j -> %s', (hint, pass, expected) => {
    expect(hintContainsPasscode(hint, pass)).toBe(expected);
    expect(validatePasscodeHint(hint, pass).ok).toBe(!expected);
  });

  it('is case-insensitive and ignores spaces/dashes in letters too', () => {
    expect(hintContainsPasscode('Pass-Word', 'passWORD')).toBe(true);
  });

  it('normalizes: trim, strip control characters, empty -> null', () => {
    expect(normalizeHint('  my pet  ')).toBe('my pet');
    expect(normalizeHint('a\u0000b\u0007c\nd')).toBe('a b c d');
    expect(normalizeHint('   ')).toBeNull();
    expect(normalizeHint('')).toBeNull();
    expect(normalizeHint(undefined)).toBeNull();
    expect(validatePasscodeHint('  ', '1234')).toEqual({ ok: true, hint: null });
  });

  it('rejects a hint over 60 characters and accepts exactly 60', () => {
    expect(PASSCODE_HINT_MAX).toBe(60);
    expect(validatePasscodeHint('x'.repeat(60), '1234').ok).toBe(true);
    expect(validatePasscodeHint('x'.repeat(61), '1234').ok).toBe(false);
  });
});

describe('[FB-77] set_nickname_passcode with a hint', () => {
  let handler: Handler;
  beforeEach(async () => {
    handler = await load('../../supabase/functions/set_nickname_passcode/index.ts');
    db.rpc.mockImplementation(async (name: string) =>
      name === 'upsert_or_verify_profile' ? { data: { user_unique_key: 'mimiu', nickname: 'Mi mi U' }, error: null } : { data: null, error: null });
  });
  const body = (extra: object) => ({ nickname: 'Mi mi U', passcode: '123456', ...extra });

  it('stores a normalized hint through the setter after creating a NEW profile', async () => {
    const res = await out(await handler(post(body({ hint: '  my dog\u0000  ' }))));
    expect(res.status).toBe(200);
    expect(res.body.hint_saved).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith('set_passcode_hint', { p_user_unique_key: 'mimiu', p_hint: 'my dog' });
    // upsert_or_verify_profile keeps its live signature
    const args = db.rpc.mock.calls.find((c) => c[0] === 'upsert_or_verify_profile')![1] as object;
    expect(Object.keys(args).sort()).toEqual(['p_nickname', 'p_passcode', 'p_timezone', 'p_user_unique_key']);
  });

  it('does NOT overwrite the hint of an existing account', async () => {
    db.tables.nicknames = { user_unique_key: 'mimiu' };
    await handler(post(body({ hint: 'new hint' })));
    expect(db.rpc.mock.calls.some((c) => c[0] === 'set_passcode_hint')).toBe(false);
  });

  it.each(CONTAINS.filter((c) => c[2]).map((c) => [c[0], c[1]]))('rejects hint %j containing passcode %j (400, nothing saved)', async (hint, passcode) => {
    const res = await out(await handler(post({ nickname: 'Mi mi U', passcode, hint })));
    expect(res).toMatchObject({ status: 400, body: { code: 'HINT_CONTAINS_PASSCODE' } });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejects a hint longer than 60', async () => {
    const res = await out(await handler(post(body({ hint: 'y'.repeat(61) }))));
    expect(res).toMatchObject({ status: 400, body: { code: 'HINT_TOO_LONG' } });
  });

  it('degrades gracefully: sign-up still succeeds when the hint SQL is not applied', async () => {
    db.rpc.mockImplementation(async (name: string) =>
      name === 'upsert_or_verify_profile'
        ? { data: { user_unique_key: 'mimiu', nickname: 'Mi mi U' }, error: null }
        : { data: null, error: { message: 'function public.set_passcode_hint does not exist' } });
    const res = await out(await handler(post(body({ hint: 'my dog' }))));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ user_unique_key: 'mimiu', hint_saved: false });
  });

  it('no hint in the request: no extra calls, response shape unchanged', async () => {
    const res = await out(await handler(post(body({}))));
    expect(res.body).toEqual({ user_unique_key: 'mimiu', nickname: 'Mi mi U' });
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('[FB-77] passcode-hint function', () => {
  let handler: Handler;
  beforeEach(async () => {
    handler = await load('../../supabase/functions/passcode-hint/index.ts');
  });

  it('returns only { hint } for a known nickname', async () => {
    db.rpc.mockResolvedValue({ data: 'my first pet', error: null });
    expect(await out(await handler(post({ nickname: 'Mi mi U' })))).toEqual({ status: 200, body: { hint: 'my first pet' } });
    expect(db.rpc).toHaveBeenCalledWith('get_passcode_hint', { p_nickname: 'Mi mi U' });
  });

  it('no hint, unknown nickname and a missing SQL function all look identical', async () => {
    const answers = [];
    for (const r of [{ data: null, error: null }, { data: '', error: null }, { data: null, error: { message: 'does not exist' } }]) {
      db.rpc.mockResolvedValue(r);
      answers.push(await out(await handler(post({ nickname: 'ghost' }))));
    }
    for (const a of answers) expect(a).toEqual({ status: 200, body: { hint: null } });
  });

  it('validates input and method, and sends CORS headers', async () => {
    expect((await out(await handler(post({})))).status).toBe(400);
    expect((await handler(new Request('http://x', { method: 'GET' }))).status).toBe(405);
    const pre = await handler(new Request('http://x', { method: 'OPTIONS' }));
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

describe('[FB-77] update-passcode-hint function', () => {
  let handler: Handler;
  const future = () => new Date(Date.now() + 3600_000).toISOString();
  beforeEach(async () => {
    handler = await load('../../supabase/functions/update-passcode-hint/index.ts');
    db.rpc.mockResolvedValue({ data: null, error: null });
    db.tables.user_sessions = { user_unique_key: 'mimiu', expires_at: future() };
    db.tables.nicknames = { passcode: '123456' };
  });
  const h = { 'x-session-token': 'tok' };

  it('needs a session token', async () => {
    expect(await out(await handler(post({ hint: 'a' })))).toMatchObject({ status: 401, body: { code: 'NO_SESSION' } });
  });

  it('rejects an unknown or expired session', async () => {
    db.tables.user_sessions = null;
    expect((await out(await handler(post({ hint: 'a' }, h)))).body.code).toBe('SESSION_INVALID');
    db.tables.user_sessions = { user_unique_key: 'mimiu', expires_at: new Date(Date.now() - 1000).toISOString() };
    expect((await out(await handler(post({ hint: 'a' }, h)))).status).toBe(401);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('sets a normalized hint for the session user and clears it with an empty hint', async () => {
    expect((await out(await handler(post({ hint: '  my dog ' }, h)))).body).toEqual({ ok: true, hint: 'my dog' });
    expect(db.rpc).toHaveBeenLastCalledWith('set_passcode_hint', { p_user_unique_key: 'mimiu', p_hint: 'my dog' });
    expect((await out(await handler(post({ hint: '' }, h)))).body).toEqual({ ok: true, hint: null });
    expect(db.rpc).toHaveBeenLastCalledWith('set_passcode_hint', { p_user_unique_key: 'mimiu', p_hint: null });
  });

  it('rejects a hint containing the stored passcode', async () => {
    const res = await out(await handler(post({ hint: 'code 12-34 56' }, h)));
    expect(res).toMatchObject({ status: 400, body: { code: 'HINT_CONTAINS_PASSCODE' } });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('answers 503 (no crash) when the SQL is not applied', async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: 'does not exist' } });
    expect((await out(await handler(post({ hint: 'ok' }, h)))).status).toBe(503);
  });
});

describe('[FB-77] SQL migration (draft, run on in-memory Postgres)', { timeout: 60000 }, () => {
  const MIGRATION = readFileSync('supabase/sql/2026-11-28-passcode-hint.sql', 'utf8');

  async function fresh() {
    const pg = new PGlite();
    await pg.exec('create role anon; create role authenticated; create role service_role;');
    await pg.exec(`create function public.canon(s text) returns text language sql immutable as $$ select lower(regexp_replace(coalesce(s,''), '\\s+', '', 'g')); $$;
      create table public.nicknames (id bigserial primary key, name text not null, passcode text, timezone text, user_unique_key text not null unique);
      grant select (id, name, user_unique_key, timezone) on public.nicknames to anon, authenticated;
      insert into public.nicknames (name, passcode, user_unique_key) values ('Mi mi U','123456','mimiu'), ('No Hint','999999','nohint');`);
    await pg.exec(MIGRATION);
    return pg;
  }
  const can = async (pg: PGlite, role: string, fn: string) =>
    (await pg.query<{ ok: boolean }>('select has_function_privilege($1,$2,$3) as ok', [role, fn, 'execute'])).rows[0].ok;

  it('is idempotent and revokes anon/authenticated, grants service_role only', async () => {
    const pg = await fresh();
    await pg.exec(MIGRATION); // second run
    for (const fn of ['public.get_passcode_hint(text)', 'public.set_passcode_hint(text, text)']) {
      expect(await can(pg, 'anon', fn)).toBe(false);
      expect(await can(pg, 'authenticated', fn)).toBe(false);
      expect(await can(pg, 'service_role', fn)).toBe(true);
    }
  });

  it('anon cannot read the column directly', async () => {
    const pg = await fresh();
    const r = await pg.query<{ ok: boolean }>(`select has_column_privilege('anon','public.nicknames','passcode_hint','select') as ok`);
    expect(r.rows[0].ok).toBe(false);
  });

  it('get_passcode_hint: same null for no hint and unknown nickname; only the hint is returned', async () => {
    const pg = await fresh();
    await pg.query(`select public.set_passcode_hint('mimiu', '  my first pet  ')`);
    const get = async (n: string) => (await pg.query<{ get_passcode_hint: unknown }>('select public.get_passcode_hint($1)', [n])).rows;
    expect(await get('MI MI  u')).toEqual([{ get_passcode_hint: 'my first pet' }]);
    expect(await get('No Hint')).toEqual(await get('Nobody At All'));
    expect(await get('No Hint')).toEqual([{ get_passcode_hint: null }]);
  });

  it('set_passcode_hint clears, strips control characters and enforces 60', async () => {
    const pg = await fresh();
    await pg.query(`select public.set_passcode_hint('mimiu', E'a\\tb')`);
    expect((await pg.query<{ passcode_hint: string }>(`select passcode_hint from public.nicknames where user_unique_key='mimiu'`)).rows[0].passcode_hint).toBe('a b');
    await pg.query(`select public.set_passcode_hint('mimiu', '')`);
    expect((await pg.query(`select passcode_hint from public.nicknames where user_unique_key='mimiu'`)).rows[0]).toEqual({ passcode_hint: null });
    await expect(pg.query('select public.set_passcode_hint($1, $2)', ['mimiu', 'z'.repeat(61)])).rejects.toThrow();
    await expect(pg.query(`update public.nicknames set passcode_hint = $1`, ['z'.repeat(61)])).rejects.toThrow(); // check constraint
  });

  it('does not touch upsert_or_verify_profile and has a rollback section', () => {
    expect(MIGRATION).not.toMatch(/upsert_or_verify_profile\s*\(/);
    expect(MIGRATION).toMatch(/ROLLBACK/);
  });

  it('admin reset snippet: validates, clears sessions, never prints the passcode', () => {
    const sql = readFileSync('supabase/sql/admin-manual-passcode-reset.sql', 'utf8');
    expect(sql).toMatch(/\^\\d\{4,10\}\$/);
    expect(sql).toMatch(/delete from public\.user_sessions/);
    expect(sql).toMatch(/canon\(n\.name\)/);
    expect(sql).not.toMatch(/select[^;]*\bn\.passcode\s*(,|\bas\b|from)/i);
    expect(sql).toMatch(/NEVER paste a real passcode/);
    expect(sql).not.toMatch(/user_unique_key\s*=\s*[^v\n]*set user_unique_key/i);
  });

  it('admin reset snippet runs: new passcode, sessions deleted, key unchanged, bad input changes nothing', async () => {
    const pg = await fresh();
    await pg.exec(`create table public.user_sessions (session_token text primary key, user_unique_key text not null);
      insert into public.user_sessions values ('t1','mimiu'), ('t2','nohint');`);
    const raw = readFileSync('supabase/sql/admin-manual-passcode-reset.sql', 'utf8');
    const run = (nick: string, pass: string, hint = 'keep') =>
      pg.exec(raw.replaceAll('REPLACE_WITH_NICKNAME', nick).replace('REPLACE_WITH_NEW_PASSCODE', pass).replace("v_new_hint     text := 'keep'", `v_new_hint     text := '${hint}'`));
    await expect(run('Mi mi U', 'abc')).rejects.toThrow();
    await expect(run('Nobody', '123456')).rejects.toThrow();
    await expect(run('Mi mi U', '0042', 'it is 0 0-42')).rejects.toThrow();
    expect((await pg.query(`select passcode from public.nicknames where user_unique_key='mimiu'`)).rows[0]).toEqual({ passcode: '123456' });
    await run('mimiu', '0042', 'my pet');
    expect((await pg.query(`select passcode, passcode_hint, user_unique_key from public.nicknames where name='Mi mi U'`)).rows[0]).toEqual({ passcode: '0042', passcode_hint: 'my pet', user_unique_key: 'mimiu' });
    expect((await pg.query(`select session_token from public.user_sessions`)).rows).toEqual([{ session_token: 't2' }]);
  });
});
