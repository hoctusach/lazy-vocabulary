// @vitest-environment jsdom
// NFR-PERF-07: Word Summary with large lists (jsdom render; relative numbers are what matter, a phone is slower).
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import WordSummaryPanel from '@/components/WordSummaryPanel';
import { check, heapMB } from './util';

afterEach(cleanup);
const mk = (n: number, tag: string) => Array.from({ length: n }, (_, i) => ({ word: `${tag}-word-${i}`, reviewCount: i % 6, nextReviewAt: '2026-12-01T00:00:00Z', learnedDate: '2026-11-27T01:00:00Z' }));

describe('NFR-PERF-07 Word Summary large lists', () => {
  for (const n of [20, 500]) {
    it(`[NFR-PERF-07] ${n} rows per lane (x3 lanes)`, () => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const t = performance.now();
        render(<WordSummaryPanel open onOpenChange={() => {}} newList={mk(n, 'n')} dueList={mk(n, 'd')} learnedList={mk(n, 'l')} onView={() => {}} />);
        times.push(performance.now() - t);
        expect(document.querySelectorAll('button.lv-row').length).toBe(n * 3);
        cleanup();
      }
      const med = [...times].sort((a, b) => a - b)[2];
      check('NFR-PERF-07', `render_${n}x3_ms`, med);
      if (n === 500) {
        const h0 = heapMB();
        render(<WordSummaryPanel open onOpenChange={() => {}} newList={mk(n, 'n')} dueList={mk(n, 'd')} learnedList={mk(n, 'l')} onView={() => {}} />);
        check('NFR-PERF-07', 'dom_nodes_1500_rows', document.querySelectorAll('*').length, { scale: false });
        check('NFR-PERF-07', 'heap_1500_rows_mb', heapMB() - h0, { scale: false });
      }
    });
  }
});
