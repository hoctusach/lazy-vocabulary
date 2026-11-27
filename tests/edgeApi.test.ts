import { afterEach, describe, expect, it, vi } from 'vitest';
import { exchangeNicknamePasscode, setNicknamePasscode } from '../src/lib/edgeApi';

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, text: async () => JSON.stringify(body) });

afterEach(() => vi.unstubAllGlobals());

describe('login API errors reach the sign-in screen', () => {
  it('exposes the server code for a wrong passcode', async () => {
    vi.stubGlobal('fetch', reply(401, { error: 'Incorrect passcode', code: 'INCORRECT_PASSCODE' }));
    await expect(exchangeNicknamePasscode('mimiu', '111111')).rejects.toMatchObject({
      status: 401,
      code: 'INCORRECT_PASSCODE',
    });
  });

  it('exposes NICKNAME_NOT_FOUND so the screen can switch to create mode', async () => {
    vi.stubGlobal('fetch', reply(404, { error: 'Nickname not found', code: 'NICKNAME_NOT_FOUND' }));
    await expect(exchangeNicknamePasscode('nobody', '111111')).rejects.toMatchObject({ code: 'NICKNAME_NOT_FOUND' });
  });

  it('exposes NICKNAME_TAKEN when creating a name that already exists', async () => {
    vi.stubGlobal('fetch', reply(409, { error: 'Nickname already exists', code: 'NICKNAME_TAKEN' }));
    await expect(setNicknamePasscode('mimiu', '222222')).rejects.toMatchObject({ status: 409, code: 'NICKNAME_TAKEN' });
  });

  it('sends nickname, passcode and timezone when creating a profile', async () => {
    const fetchMock = reply(200, { nickname: 'mimiu' });
    vi.stubGlobal('fetch', fetchMock);
    await setNicknamePasscode('mimiu', '222222');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ nickname: 'mimiu', passcode: '222222' });
    expect(typeof body.timezone).toBe('string');
  });
});
