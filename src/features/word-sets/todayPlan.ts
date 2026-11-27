/**
 * [FB-63] The sources today's list is built from are frozen for the rest of the local day. Ticking/unticking a set in
 * the Library changes the NEXT day only ("Changes apply from tomorrow."). Stored as { date, sources } in localStorage.
 */
export const TODAY_PLAN_KEY = 'lazyVoca.todayPlan.v1';
export const PLAN_NOTICE = 'Changes apply from tomorrow.';

export interface TodayPlan {
  date: string;
  sources: string[];
}

function read(): TodayPlan | null {
  try {
    const raw = window.localStorage.getItem(TODAY_PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<TodayPlan>;
    if (typeof p?.date === 'string' && Array.isArray(p.sources)) {
      return { date: p.date, sources: p.sources.filter((s): s is string => typeof s === 'string') };
    }
  } catch {
    /* corrupt or blocked: treated as no plan */
  }
  return null;
}

function write(plan: TodayPlan): void {
  try {
    window.localStorage.setItem(TODAY_PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* blocked storage: the plan then follows the live selection (nothing to freeze) */
  }
}

/**
 * The frozen source ids for `today`. A new local day (or no plan yet) snapshots the current selection. Ids that no
 * longer exist (deleted set) are dropped; if nothing is left the live selection is used.
 */
export function getPlanSources(live: readonly string[], valid: (id: string) => boolean, today: string): string[] {
  const plan = read();
  if (plan && plan.date === today) {
    const kept = plan.sources.filter(valid);
    if (kept.length > 0) {
      if (kept.length !== plan.sources.length) write({ date: today, sources: kept });
      return kept;
    }
  }
  const next = [...live];
  write({ date: today, sources: next });
  return next;
}

/** A brand-new set (import / create) joins today's plan right away; nothing else in the plan changes. */
export function addToPlan(id: string, today: string): void {
  const plan = read();
  if (!plan || plan.date !== today) return; // next read snapshots the live selection, which already has it
  if (!plan.sources.includes(id)) write({ date: today, sources: [...plan.sources, id] });
}

export function __clearPlanForTests(): void {
  try { window.localStorage.removeItem(TODAY_PLAN_KEY); } catch { /* ignore */ }
}
