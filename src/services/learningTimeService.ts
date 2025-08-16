export interface LearningTimeRecord {
  [date: string]: number; // milliseconds
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const API_URL = '/api/learning-time';

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
const synced: Record<string, boolean> = {};

async function sendSession(learnerId: string, date: string, duration: number) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, date, duration }),
    });
  } catch { /* ignore */
    // ignore network errors
  }
}

async function syncWithServer(learnerId: string) {
  try {
    const res = await fetch(`${API_URL}?learnerId=${encodeURIComponent(learnerId)}`);
    const remote: LearningTimeRecord = res.ok ? await res.json() : {};
    const local = loadRecord(learnerId);
    const merged: LearningTimeRecord = { ...remote, ...local };

    for (const [date, ms] of Object.entries(local)) {
      const remoteMs = remote[date] || 0;
      if (ms > remoteMs) {
        await sendSession(learnerId, date, ms - remoteMs);
      }
    }

    saveRecord(learnerId, merged);
  } catch { /* ignore */
    // ignore sync errors
  }
}

function startSession(learnerId: string) {
  if (sessionStarts[learnerId] == null) {
    sessionStarts[learnerId] = Date.now();
  }
  if (!synced[learnerId]) {
    synced[learnerId] = true;
    void syncWithServer(learnerId);
  }
}

function stopSession(learnerId: string): number {
  const start = sessionStarts[learnerId];
  if (start == null) return 0;
  const duration = Date.now() - start;
  sessionStarts[learnerId] = null;

  const record = loadRecord(learnerId);
  const today = formatDate(new Date());
  record[today] = (record[today] || 0) + duration;
  saveRecord(learnerId, record);
  void sendSession(learnerId, today, duration);
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
  syncWithServer,
};

export default learningTimeService;
