import { getLocalDateISO } from '@/utils/date';

export interface LearningTimeRecord {
  [date: string]: number; // milliseconds
}

/** The learner's local calendar day. */
function formatDate(date: Date): string {
  return getLocalDateISO(date);
}

function getStorageKey(learnerId: string) {
  return `learningTime_${learnerId}`;
}

function loadRecord(learnerId: string): LearningTimeRecord {
  try {
    const data = localStorage.getItem(getStorageKey(learnerId));
    return data ? JSON.parse(data) : {};
  } catch { /* ignore */
    return {};
  }
}

function saveRecord(learnerId: string, record: LearningTimeRecord) {
  try {
    localStorage.setItem(getStorageKey(learnerId), JSON.stringify(record));
  } catch { /* ignore */
    // ignore write errors
  }
}

const sessionStarts: Record<string, number | null> = {};

function startSession(learnerId: string) {
  if (sessionStarts[learnerId] == null) {
    sessionStarts[learnerId] = Date.now();
  }
}

function stopSession(learnerId: string): number {
  const start = sessionStarts[learnerId];
  if (start == null) return 0;
  // A device clock moved backwards during the session must not subtract time.
  const duration = Math.max(0, Date.now() - start);
  sessionStarts[learnerId] = null;

  const record = loadRecord(learnerId);
  const today = formatDate(new Date());
  record[today] = (record[today] || 0) + duration;
  saveRecord(learnerId, record);
  return duration;
}

function getTotalHours(learnerId: string): number {
  const record = loadRecord(learnerId);
  const totalMs = Object.values(record).reduce((sum, ms) => sum + ms, 0);
  return totalMs / (1000 * 60 * 60);
}

export const learningTimeService = {
  startSession,
  stopSession,
  getTotalHours,
};

export default learningTimeService;
