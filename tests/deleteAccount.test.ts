import { describe, expect, it } from 'vitest';
import { mapDeleteAccountError } from '../src/lib/account/deleteAccount';

describe('mapDeleteAccountError', () => {
  it('maps bad credentials', () => {
    expect(mapDeleteAccountError({ code: '28000', message: 'invalid nickname or passcode' }).code).toBe('INVALID_CREDENTIALS');
  });
  it('maps a not-yet-deployed function to a friendly message', () => {
    const e = mapDeleteAccountError({ code: 'PGRST202', message: 'Could not find the function public.delete_my_account' });
    expect(e.code).toBe('NOT_DEPLOYED');
    expect(e.message).toMatch(/not available yet/i);
  });
  it('maps network and unknown errors', () => {
    expect(mapDeleteAccountError({ message: 'TypeError: Failed to fetch' }).code).toBe('NETWORK');
    expect(mapDeleteAccountError({ message: 'boom' }).code).toBe('UNKNOWN');
  });
});
