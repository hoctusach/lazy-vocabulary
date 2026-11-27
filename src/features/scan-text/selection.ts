/** [FB-66] Turning OCR text into tappable words, a phrase selection, and the sentence that becomes the example. */

export interface Token {
  text: string;
  start: number;
  end: number;
  /** True for words (tappable), false for spaces / punctuation. */
  word: boolean;
}

type SegmenterCtor = new (locale?: string, opts?: { granularity: 'word' | 'sentence' }) => {
  segment(input: string): Iterable<{ segment: string; index: number; isWordLike?: boolean }>;
};
const segmenterCtor = (): SegmenterCtor | null => ((Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter ?? null);

/** Splits into word / non-word tokens. Uses Intl.Segmenter (works for scripts without spaces) with a regex fallback. */
export function tokenize(text: string, locale?: string): Token[] {
  const Seg = segmenterCtor();
  const out: Token[] = [];
  if (Seg) {
    try {
      for (const s of new Seg(locale, { granularity: 'word' }).segment(text)) {
        out.push({ text: s.segment, start: s.index, end: s.index + s.segment.length, word: Boolean(s.isWordLike) });
      }
      return out;
    } catch {
      out.length = 0;
    }
  }
  const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu;
  for (const m of text.matchAll(re)) {
    out.push({ text: m[0], start: m.index!, end: m.index! + m[0].length, word: /[\p{L}\p{N}]/u.test(m[0]) });
  }
  return out;
}

/** Selection over the token array: anchor..focus (inclusive, either order) or null. */
export interface Selection { anchor: number; focus: number }

/** Tap rules: first tap = one word; a tap on another word while a single word is selected extends to a phrase; otherwise restart. */
export function tapSelect(tokens: Token[], sel: Selection | null, index: number): Selection | null {
  if (!tokens[index]?.word) return sel;
  if (!sel || sel.anchor !== sel.focus) return { anchor: index, focus: index };
  if (sel.anchor === index) return sel;
  return { anchor: sel.anchor, focus: index };
}

/** Drag rule: from the pressed word to the word under the pointer. Non-word tokens under the pointer keep the old focus. */
export function dragSelect(tokens: Token[], sel: Selection | null, from: number, over: number): Selection | null {
  if (!tokens[from]?.word) return sel;
  if (!tokens[over]?.word) return sel ?? { anchor: from, focus: from };
  return { anchor: from, focus: over };
}

/** [start, end) of the selection in the source text, trimmed to its first / last word. */
export function selectionRange(tokens: Token[], sel: Selection | null): { start: number; end: number } | null {
  if (!sel) return null;
  const lo = Math.min(sel.anchor, sel.focus);
  const hi = Math.max(sel.anchor, sel.focus);
  const first = tokens[lo];
  const last = tokens[hi];
  if (!first || !last) return null;
  return { start: first.start, end: last.end };
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The selected phrase, whitespace-normalised (line breaks inside a phrase become single spaces). */
export function selectionPhrase(text: string, tokens: Token[], sel: Selection | null): string {
  const r = selectionRange(tokens, sel);
  return r ? squash(text.slice(r.start, r.end)) : '';
}

function sentenceSpans(text: string, locale?: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  // Blank lines are hard boundaries (headings, paragraphs); single line breaks are OCR wrapping.
  let offset = 0;
  for (const block of text.split(/\n\s*\n/)) {
    const blockStart = text.indexOf(block, offset);
    offset = blockStart + block.length;
    const Seg = segmenterCtor();
    const flat = block.replace(/\s/g, (c) => (c === '\n' || c === '\r' ? ' ' : c)); // same length: offsets stay valid
    let parts: { start: number; end: number }[] = [];
    if (Seg) {
      try {
        for (const s of new Seg(locale, { granularity: 'sentence' }).segment(flat)) {
          parts.push({ start: blockStart + s.index, end: blockStart + s.index + s.segment.length });
        }
      } catch { parts = []; }
    }
    if (parts.length === 0) {
      for (const m of flat.matchAll(/[^.!?。！？]+[.!?。！？]*\s*/gu)) parts.push({ start: blockStart + m.index!, end: blockStart + m.index! + m[0].length });
    }
    spans.push(...parts);
  }
  return spans;
}

/** The sentence(s) touching the selection, as one clean line: the example (context) of the word. */
export function sentenceFor(text: string, tokens: Token[], sel: Selection | null, locale?: string): string {
  const r = selectionRange(tokens, sel);
  if (!r) return '';
  const hit = sentenceSpans(text, locale).filter((s) => s.start < r.end && s.end > r.start);
  if (hit.length === 0) return '';
  return squash(text.slice(hit[0].start, hit[hit.length - 1].end));
}
