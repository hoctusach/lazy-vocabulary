/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { learningProgressService } from '@/services/learningProgressService';
import { upsertLearned } from '@/lib/db/learned';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

vi.mock('@/lib/db/learned', () => ({
  getLearned: vi.fn().mockResolvedValue([]),
  resetLearned: vi.fn().mockResolvedValue(undefined),
  upsertLearned: vi.fn().mockResolvedValue(undefined)
}));

describe('learningProgressService markWordLearned', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true
    });
    vi.clearAllMocks();
  });

  it('returns a Supabase payload that uses the learned SRS state', async () => {
    const result = await learningProgressService.markWordLearned('apple');

    expect(result).not.toBeNull();
    expect(result?.payload.srs_state).toBe('learned');

    expect(upsertLearned).toHaveBeenCalled();
    const [, payload] = vi.mocked(upsertLearned).mock.calls.at(-1)!;
    expect(payload.srs_state).toBe('learned');
  });
});
