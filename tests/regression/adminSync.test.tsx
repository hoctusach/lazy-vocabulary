// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const sync = vi.hoisted(() => vi.fn(async () => {}));
const del = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/features/admin/adminApi', async (orig) => ({ ...(await orig<Record<string, unknown>>()), syncImportedSets: sync, deleteImportedSetRemote: del }));

import { VocabularySetProvider, useVocabularySets } from '@/features/word-sets/VocabularySetContext';

let api: ReturnType<typeof useVocabularySets>;
const Grab = () => { api = useVocabularySets(); return null; };

beforeEach(() => { localStorage.clear(); sync.mockClear(); del.mockClear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('[FB-55] own imported/manual sets are synced to the server best-effort', () => {
  it('nothing is uploaded when there are no imported sets; a new manual set is uploaded (debounced); delete is mirrored', async () => {
    render(<VocabularySetProvider><Grab /></VocabularySetProvider>);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(sync).not.toHaveBeenCalled();
    let id = '';
    await act(async () => { const r = api.createManualSet('Trip', { word: 'ticket', meaning: 'a pass', category: 'topic vocab' }); if (r.ok) id = r.set!.id; });
    expect(sync).not.toHaveBeenCalled(); // debounced
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(sync).toHaveBeenCalledTimes(1);
    const sent = (sync.mock.calls[0] as unknown as [Array<{ id: string; name: string; sheets: Record<string, unknown[]> }>])[0];
    expect(sent[0]).toMatchObject({ id, name: 'Trip' });
    expect(Object.values(sent[0].sheets).flat()).toHaveLength(1);
    await act(async () => { api.remove(id); });
    expect(del).toHaveBeenCalledWith(id);
  });
});
