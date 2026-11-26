/**
 * @vitest-environment node
 * The two Supabase Edge Functions that handle login (A8, A19-A21), run with a fake Deno and a fake database client.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (req: Request) => Promise<Response>;

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  nicknameRow: null as unknown,
  upserts: [] as unknown[],
  upsertError: null as unknown,
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2.48.0', () => ({
  createClient: () => ({
    rpc: (name: string, args: unknown) => db.rpc(name, args),
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.nicknameRow }) }) }),
      upsert: async (row: unknown) => {
        db.upserts.push({ table, row });
        return { error: db.upsertError };
      },
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

const post = (body: unknown, method = 'POST') =>
  method === 'POST'
    ? new Request('http://x/fn', { method, headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) })
    : new Request('http://x/fn', { method });
const json = async (res: Response) => ({ status: res.status, body: await res.json() });

beforeEach(() => {
  db.rpc.mockReset();
  db.nicknameRow = null;
  db.upserts = [];
  db.upsertError = null;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('set_nickname_passcode (create profile)', () => {
  let handler: Handler;
  beforeEach(async () => {
    handler = await load('../supabase/functions/set_nickname_passcode/index.ts');
    db.rpc.mockResolvedValue({ data: { user_unique_key: 'mimiu', nickname: 'Mi mi U' }, error: null });
  });

  it('answers the CORS preflight and rejects other methods (A19)', async () => {
    expect((await handler(new Request('http://x', { method: 'OPTIONS' }))).status).toBe(200);
    expect((await json(await handler(post({}, 'GET')))).status).toBe(405);
  });

  it('rejects invalid JSON and a missing nickname (A19)', async () => {
    expect((await json(await handler(post('{bad')))).status).toBe(400);
    expect(await json(await handler(post({ passcode: '123456' })))).toEqual({ status: 400, body: { error: 'Nickname is required' } });
    expect((await json(await handler(post({ nickname: '   ', passcode: '123456' })))).status).toBe(400);
  });

  it.each(['abc', '123', '12345678901', '12 34', '', '12.34'])('rejects the passcode %j', async (passcode) => {
    const res = await json(await handler(post({ nickname: 'mimiu', passcode })));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/4-10 digits/);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('accepts a numeric passcode and 4 / 10 digits', async () => {
    for (const passcode of [1234, '1234', '9999999999']) {
      expect((await json(await handler(post({ nickname: 'mimiu', passcode })))).status).toBe(200);
    }
  });

  it('derives the user key from the nickname (A5)', async () => {
    await handler(post({ nickname: '  Mi  mi U ', passcode: '123456' }));
    expect(db.rpc).toHaveBeenCalledWith('upsert_or_verify_profile', expect.objectContaining({ user_unique_key: 'mimiu', nickname: 'Mi  mi U', passcode: 123456 }));
  });

  it('checks the timezone (A20)', async () => {
    const bad = await json(await handler(post({ nickname: 'mimiu', passcode: '123456', timezone: 'Mars/Base' })));
    expect(bad).toEqual({ status: 400, body: { error: 'Invalid timezone provided.', code: 'INVALID_TIMEZONE' } });
    await handler(post({ nickname: 'mimiu', passcode: '123456', timezone: 'Asia/Ho_Chi_Minh' }));
    expect(db.rpc).toHaveBeenLastCalledWith('upsert_or_verify_profile', expect.objectContaining({ p_timezone: 'Asia/Ho_Chi_Minh' }));
    await handler(post({ nickname: 'mimiu', passcode: '123456' }));
    expect(db.rpc).toHaveBeenLastCalledWith('upsert_or_verify_profile', expect.objectContaining({ p_timezone: null }));
  });

  it('turns "nickname_already_exists" into 409 NICKNAME_TAKEN', async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: 'nickname_already_exists' } });
    expect(await json(await handler(post({ nickname: 'mimiu', passcode: '222222' })))).toEqual({
      status: 409,
      body: { error: 'Nickname already exists', code: 'NICKNAME_TAKEN' },
    });
  });

  it('turns other database errors into 500', async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '123456' })))).status).toBe(500);
  });

  it('returns the key and nickname, falling back to the derived key', async () => {
    expect(await json(await handler(post({ nickname: 'Mi mi U', passcode: '123456' })))).toEqual({
      status: 200,
      body: { user_unique_key: 'mimiu', nickname: 'Mi mi U' },
    });
    db.rpc.mockResolvedValue({ data: null, error: null });
    expect((await json(await handler(post({ nickname: 'New One', passcode: '123456' })))).body).toEqual({ user_unique_key: 'newone', nickname: 'New One' });
  });

  it.each(['0123', '00123', '0000', '0123456789'])('refuses a new passcode that starts with 0: %s (A8)', async (passcode) => {
    const res = await json(await handler(post({ nickname: 'mimiu', passcode })));
    expect(res).toEqual({ status: 400, body: { error: 'Passcode cannot start with 0.', code: 'PASSCODE_LEADING_ZERO' } });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('a passcode with a 0 inside or at the end is fine', async () => {
    for (const passcode of ['1023', '1230', '9000000000']) {
      expect((await json(await handler(post({ nickname: 'mimiu', passcode })))).status).toBe(200);
    }
  });

  it('derives the same key for a nickname with a zero-width character (A6)', async () => {
    await handler(post({ nickname: 'mi\u200Bmiu', passcode: '123456' }));
    expect(db.rpc).toHaveBeenCalledWith('upsert_or_verify_profile', expect.objectContaining({ user_unique_key: 'mimiu' }));
  });
});

describe('nickname-passcode-exchange (sign in)', () => {
  let handler: Handler;
  beforeEach(async () => {
    handler = await load('../supabase/functions/nickname-passcode-exchange/index.ts');
  });

  const okVerify = () =>
    db.rpc.mockImplementation(async (name: string) =>
      name === 'verify_nickname_passcode' ? { data: [{ user_unique_key: 'mimiu' }], error: null } : { data: null, error: null }
    );

  it('wrong passcode for an existing nickname is 401 INCORRECT_PASSCODE', async () => {
    db.rpc.mockResolvedValue({ data: [], error: null });
    db.nicknameRow = { user_unique_key: 'mimiu' };
    expect(await json(await handler(post({ nickname: 'Mi mi U', passcode: '999999' })))).toEqual({
      status: 401,
      body: { error: 'Incorrect passcode', code: 'INCORRECT_PASSCODE' },
    });
    expect(db.upserts).toEqual([]);
  });

  it('unknown nickname is 404 NICKNAME_NOT_FOUND', async () => {
    db.rpc.mockResolvedValue({ data: [], error: null });
    expect((await json(await handler(post({ nickname: 'nobody', passcode: '123456' })))).body.code).toBe('NICKNAME_NOT_FOUND');
  });

  it('a verification error is 401 AUTH_FAILED', async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '123456' })))).body.code).toBe('AUTH_FAILED');
  });

  it('validates the input like create profile', async () => {
    expect((await json(await handler(post({ nickname: '', passcode: '123456' })))).status).toBe(400);
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '12' })))).status).toBe(400);
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '123456', timezone: 'Nope/Nope' })))).body.code).toBe('INVALID_TIMEZONE');
    expect((await json(await handler(post('{bad')))).status).toBe(400);
    expect((await json(await handler(post({}, 'GET')))).status).toBe(405);
    expect((await handler(new Request('http://x', { method: 'OPTIONS' }))).status).toBe(204);
  });

  it('success returns a 24 hour session token and stores it (A21)', async () => {
    okVerify();
    const before = Math.floor(Date.now() / 1000);
    const { status, body } = await json(await handler(post({ nickname: 'Mi mi U', passcode: '123456' })));
    expect(status).toBe(200);
    expect(body).toMatchObject({ token_type: 'bearer', expires_in: 86400, user_unique_key: 'mimiu', nickname: 'Mi mi U' });
    expect(body.expires_at).toBeGreaterThanOrEqual(before + 86400);
    expect(body.session_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(db.upserts).toHaveLength(1);
    expect(db.upserts[0]).toMatchObject({ table: 'user_sessions', row: { session_token: body.session_token, user_unique_key: 'mimiu' } });
  });

  it('two sign-ins get different tokens', async () => {
    okVerify();
    const a = (await json(await handler(post({ nickname: 'mimiu', passcode: '123456' })))).body.session_token;
    const b = (await json(await handler(post({ nickname: 'mimiu', passcode: '123456' })))).body.session_token;
    expect(a).not.toBe(b);
  });

  it('looks up the same account for a nickname with a zero-width character (A6)', async () => {
    db.rpc.mockResolvedValue({ data: [], error: null });
    db.nicknameRow = { user_unique_key: 'mimiu' };
    const res = await json(await handler(post({ nickname: 'mi\u200Bmiu', passcode: '999999' })));
    expect(res.body.code).toBe('INCORRECT_PASSCODE'); // found the real account, so only the passcode is wrong
  });

  it('an existing passcode written with leading zeros can still sign in (nothing is locked out)', async () => {
    okVerify();
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '0123' })))).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith('verify_nickname_passcode', { nickname: 'mimiu', passcode: 123 });
  });

  it('a failing profile update or session save is 500', async () => {
    db.rpc.mockImplementation(async (name: string) =>
      name === 'verify_nickname_passcode' ? { data: [{ user_unique_key: 'mimiu' }], error: null } : { data: null, error: { message: 'x' } }
    );
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '123456' })))).status).toBe(500);
    okVerify();
    db.upsertError = { message: 'x' };
    expect((await json(await handler(post({ nickname: 'mimiu', passcode: '123456' })))).status).toBe(500);
  });
});
