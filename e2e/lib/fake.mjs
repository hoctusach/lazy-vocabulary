// Canned Supabase backend. Everything the app sends to a supabase host is answered here.
export const FAKE_HOST = 'fake-supabase.test';
export const EDGE_HOST = 'vijvcojvemkzgpzpowzh.supabase.co'; // hard-coded in src/lib/edgeApi.ts

import fs from 'node:fs';
export const POOL = JSON.parse(fs.readFileSync(new URL('./pool.json', import.meta.url), 'utf8'));

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': '*',
};

const json = (status, body, extra = {}) => ({
  status, headers: { ...CORS, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body),
});

export function createFake(opts = {}) {
  const f = {
    mode: 'ok',                 // 'ok' | 'down' (abort every supabase request)
    exchange: 'ok',             // ok | INCORRECT_PASSCODE | NICKNAME_NOT_FOUND | 500 | hang
    create: 'ok',               // ok | taken
    pool: opts.pool || POOL,
    searchRows: null,           // override rows for search_vocabulary
    leaderboard: [],            // learned_words rows
    summaryDays: null,          // learned_days for user_progress_summary
    learned: new Set(),
    dueIds: new Set(),
    calls: [],                  // {kind, name, body}
    ...opts,
  };
  const rec = (kind, name, body) => f.calls.push({ kind, name, body });
  f.count = (name) => f.calls.filter((c) => c.name === name).length;

  const row = (w, extra = {}) => ({
    word_id: w.word, word: w.word, category: w.category, meaning: w.meaning, example: w.example,
    translation: w.translation, is_today_selection: true, new_selected_today: true,
    review_count: 0, srs_state: null, ...extra,
  });

  f.handle = (url, method, postData) => {
    const u = new URL(url);
    const isEdge = u.hostname === EDGE_HOST;
    if (method === 'OPTIONS') return { status: 204, headers: CORS, body: '' };
    if (f.mode === 'down') return 'abort';
    let body = {};
    try { body = postData ? JSON.parse(postData) : {}; } catch { body = {}; }

    if (isEdge) {
      const name = u.pathname.split('/').pop();
      rec('edge', name, body);
      if (name === 'nickname-passcode-exchange') {
        if (f.exchange === 'hang') return 'hang';
        if (f.exchange === '500') return json(500, { error: 'boom' });
        if (f.exchange === 'INCORRECT_PASSCODE') return json(401, { error: 'bad', code: 'INCORRECT_PASSCODE' });
        if (f.exchange === 'NICKNAME_NOT_FOUND') return json(404, { error: 'nf', code: 'NICKNAME_NOT_FOUND' });
        return json(200, {
          session_token: 'aaa.bbb.ccc', token_type: 'bearer', expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user_unique_key: String(body.nickname || 'e2e').toLowerCase().replace(/\s+/g, ''), nickname: body.nickname,
        });
      }
      if (name === 'set_nickname_passcode') {
        if (f.create === 'taken') return json(409, { error: 'taken', code: 'NICKNAME_TAKEN' });
        return json(200, { ok: true });
      }
      return json(404, { error: 'unknown edge function ' + name });
    }

    // PostgREST
    const path = u.pathname.replace(/^\/rest\/v1\//, '');
    if (path.startsWith('rpc/')) {
      const name = path.slice(4);
      rec('rpc', name, body);
      switch (name) {
        case 'generate_daily_selection_v2':
          return json(200, f.pool.slice(0, body.p_count || 8).map((w) =>
            row(w, f.learned.has(w.word) ? { srs_state: 'learned', is_today_selection: false } : {})));
        case 'fetch_vocabulary_by_ids':
          return json(200, f.pool.filter((w) => (body.p_ids || []).includes(w.word)).map((w) => row(w)));
        case 'search_vocabulary': {
          if (f.searchRows) return json(200, f.searchRows);
          const q = String(body.p_query || '').toLowerCase();
          return json(200, f.pool.filter((w) => w.word.toLowerCase().includes(q)).map((w) => row(w)));
        }
        case 'mark_word_learned_by_key': {
          f.learned.add(body.p_word_id);
          return json(200, [{
            user_unique_key: body.p_user_key, word_id: body.p_word_id, srs_state: 'learned',
            learned_at: new Date().toISOString(), last_review_at: new Date().toISOString(),
            next_review_at: new Date(Date.now() + 86400000).toISOString(), review_count: 1, in_review_queue: false,
          }]);
        }
        case 'mark_word_new_by_key': f.learned.delete(body.p_word_id); return json(200, []);
        case 'get_public_progress_by_token': return json(200, []);
        case 'get_or_create_share_token': return json(200, 'tok-e2e');
        default: return json(200, []);
      }
    }
    const table = path.split('?')[0];
    rec('table', table, null);
    const wantsObject = /pgrst\.object/.test(u.searchParams.get('x') || '') || true;
    if (table === 'learned_words') return json(200, f.leaderboard);
    if (table === 'user_progress_summary') {
      if (!f.summaryDays) return json(406, { code: 'PGRST116', message: 'no rows', details: '0 rows' });
      return json(200, { learning_count: 0, learned_count: f.summaryDays.length, learning_due_count: 0,
        remaining_count: 100, learning_time: 0, learned_days: f.summaryDays, updated_at: new Date().toISOString() });
    }
    if (table === 'nicknames') return json(406, { code: 'PGRST116', message: 'no rows', details: '0 rows' });
    return json(200, []);
  };
  return f;
}
