import { lovableCors } from './corsMiddleware';

interface LearningTimeRecord {
  [date: string]: number;
}

function getStorageKey(learnerId: string) {
  return `learningTime_${learnerId}`;
}

function loadRecord(learnerId: string): LearningTimeRecord {
  try {
    const data = localStorage.getItem(getStorageKey(learnerId));
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveRecord(learnerId: string, record: LearningTimeRecord) {
  try {
    localStorage.setItem(getStorageKey(learnerId), JSON.stringify(record));
  } catch {
    // ignore write errors
  }
}

interface Req {
  method: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, unknown>;
  on(event: string, cb: (chunk: string) => void): void;
}

interface Res {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

async function parseBody(req: Req): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: string) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

export default async function handler(req: Req, res: Res) {
  lovableCors(req, res, () => {});

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { learnerId, duration, date } = body as Record<string, any>;
      if (!learnerId || typeof duration !== 'number') {
        res.statusCode = 400;
        res.end('Invalid payload');
        return;
      }
      const day = (date as string) || new Date().toISOString().split('T')[0];
      const record = loadRecord(learnerId);
      record[day] = (record[day] || 0) + duration;
      saveRecord(learnerId, record);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ total: record[day] }));
    } catch {
      res.statusCode = 400;
      res.end('Invalid payload');
    }
    return;
  }

  if (req.method === 'GET') {
    const url = new URL(req.url || '', 'http://localhost');
    const { pathname } = url;
    if (pathname.startsWith('/api/learning-time/total/')) {
      const learnerId = decodeURIComponent(pathname.split('/').pop() || '');
      const record = loadRecord(learnerId);
      const totalMs = Object.values(record).reduce((sum, ms) => sum + ms, 0);
      const totalHours = totalMs / (1000 * 60 * 60);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ totalHours }));
      return;
    }

    const learnerId = url.searchParams.get('learnerId');
    const record = learnerId ? loadRecord(learnerId) : {};
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(record));
    return;
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET,POST,OPTIONS');
  res.end('Method not allowed');
}

