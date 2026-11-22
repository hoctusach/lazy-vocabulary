/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BUILTIN_GROUPS,
  KEEP_ONE_SOURCE_MESSAGE,
  SELECTED_SOURCES_KEY,
  allBuiltinSourceIds,
  clearAllVocabularySets,
  deleteVocabularySet,
  getActiveSetId,
  getSelectedSources,
  importVocabularySet,
  selectedBuiltinGroups,
  selectedImportedIds,
  setBuiltinGroupsSelected,
  setSelectedSources,
  toggleSource,
} from '@/features/word-sets/vocabularySetStore';

const sheets = { c: [{ word: 'alpha', meaning: 'm', example: 'e', count: 0, category: 'c' }] };
const mk = (name = 'Mine') => {
  const r = importVocabularySet(name, sheets);
  if (r.ok === false) throw new Error(r.error);
  return r.set.id;
};

describe('multi-set selection', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to all six built-in groups', () => {
    expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
    expect(allBuiltinSourceIds()).toHaveLength(6);
  });

  it('migrates old ACTIVE_KEY "default" to all six groups and persists the new key', () => {
    localStorage.setItem('lv.vocabularySets.active', 'default');
    expect(localStorage.getItem(SELECTED_SOURCES_KEY)).toBeNull();
    expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
    expect(JSON.parse(localStorage.getItem(SELECTED_SOURCES_KEY) as string)).toEqual(allBuiltinSourceIds());
  });

  it('migrates an old imported active id to [that id]', () => {
    const id = mk();
    localStorage.removeItem(SELECTED_SOURCES_KEY);
    localStorage.setItem('lv.vocabularySets.active', id);
    expect(getSelectedSources()).toEqual([id]);
  });

  it('an old active id whose set is gone migrates to the built-in groups', () => {
    localStorage.setItem('lv.vocabularySets.active', 'set_missing');
    expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
  });

  it('persists the selection and keeps ACTIVE_KEY in step', () => {
    const id = mk();
    expect(setSelectedSources(['default:idioms', id])).toEqual({ ok: true });
    expect(getSelectedSources()).toEqual(['default:idioms', id]);
    expect(JSON.parse(localStorage.getItem(SELECTED_SOURCES_KEY) as string)).toEqual(['default:idioms', id]);
    expect(getActiveSetId()).not.toBe('set_missing');
    expect(localStorage.getItem('lv.vocabularySets.active')).toBe('default');
    expect(setSelectedSources([id])).toEqual({ ok: true });
    expect(localStorage.getItem('lv.vocabularySets.active')).toBe(id);
  });

  it('drops unknown ids and ignores a corrupt value', () => {
    expect(setSelectedSources(['default:idioms', 'default:nope', 'set_ghost'])).toEqual({ ok: true });
    expect(getSelectedSources()).toEqual(['default:idioms']);
    localStorage.setItem(SELECTED_SOURCES_KEY, '{oops');
    expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
  });

  it('refuses to leave nothing selected', () => {
    setSelectedSources(['default:idioms']);
    expect(toggleSource('default:idioms')).toEqual({ ok: false, error: KEEP_ONE_SOURCE_MESSAGE });
    expect(setSelectedSources([])).toEqual({ ok: false, error: KEEP_ONE_SOURCE_MESSAGE });
    expect(getSelectedSources()).toEqual(['default:idioms']);
  });

  it('toggles individual groups and the built-in parent', () => {
    expect(toggleSource('default:grammar')).toEqual({ ok: true, selected: false });
    expect(selectedBuiltinGroups()).toHaveLength(5);
    expect(toggleSource('default:grammar')).toEqual({ ok: true, selected: true });
    expect(setBuiltinGroupsSelected(false)).toEqual({ ok: false, error: KEEP_ONE_SOURCE_MESSAGE });
    const id = mk();
    expect(setBuiltinGroupsSelected(false)).toEqual({ ok: true });
    expect(getSelectedSources()).toEqual([id]);
    expect(setBuiltinGroupsSelected(true)).toEqual({ ok: true });
    expect(selectedBuiltinGroups()).toEqual([...BUILTIN_GROUPS]);
    expect(selectedImportedIds()).toEqual([id]);
  });

  it('[FB-18] importing adds to the selection without deselecting anything', () => {
    setSelectedSources(['default:idioms']);
    const id = mk();
    expect(getSelectedSources()).toEqual(['default:idioms', id]);
  });

  it('deleting an imported set removes it; an empty selection falls back to all built-in groups', () => {
    const a = mk('A');
    const b = mk('B');
    setSelectedSources(['default:idioms', a, b]);
    expect(deleteVocabularySet(a).ok).toBe(true);
    expect(getSelectedSources()).toEqual(['default:idioms', b]);
    setSelectedSources([b]);
    expect(deleteVocabularySet(b).ok).toBe(true);
    expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
    expect(getActiveSetId()).toBe('default');
  });

  it('account reset clears the selection key', () => {
    setSelectedSources(['default:idioms']);
    clearAllVocabularySets();
    expect(localStorage.getItem(SELECTED_SOURCES_KEY)).toBeNull();
  });
});

describe('[FB-22] multi-set selection: storage failures and header label', () => {
  beforeEach(() => localStorage.clear());

  it('reads fall back to all groups when localStorage.getItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
    } finally {
      spy.mockRestore();
    }
  });

  it('writes report a clear error (and keep the old selection) when setItem throws', () => {
    setSelectedSources(['default:idioms', 'default:grammar']);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      const result = toggleSource('default:idioms');
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.error).toMatch(/storage is not available/);
    } finally {
      spy.mockRestore();
    }
    expect(getSelectedSources()).toEqual(['default:idioms', 'default:grammar']);
  });

  it('a throwing localStorage getter does not crash selection reads', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });
    try {
      expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
      expect(setSelectedSources(['default:idioms']).ok).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('a stored selection naming only deleted sets falls back to all groups', () => {
    localStorage.setItem(SELECTED_SOURCES_KEY, JSON.stringify(['set_gone']));
    expect(getSelectedSources()).toEqual(allBuiltinSourceIds());
  });
});
