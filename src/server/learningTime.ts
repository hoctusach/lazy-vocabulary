import { lovableCors } from './corsMiddleware';
import { promises as fs } from 'fs';
import path from 'path';

// Simple JSON file storage for learning time records
const DB_PATH = path.join(process.cwd(), 'learning-time.json');

interface LearningTimeRecord {
  [date: string]: number;
}

interface DbData {
  [learnerId: string]: LearningTimeRecord;
}

async function loadDb(): Promise<DbData> {
  try {
    const text = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(text) as DbData;
  } catch { /* ignore */
    return {};
  }
}

async function saveDb(data: DbData) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
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
      const { learnerId, duration, date } = body;
      if (!learnerId || typeof duration !== 'number') {
        res.statusCode = 400;
        res.end('Invalid payload');
        return;
      }
      const day = date || new Date().toISOString().split('T')[0];
      const db = await loadDb();
      db[learnerId] = db[learnerId] || {};
      db[learnerId][day] = (db[learnerId][day] || 0) + duration;
      await saveDb(db);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ total: db[learnerId][day] }));
    } catch { /* ignore */
      res.statusCode = 400;
      res.end('Invalid payload');
    }
    return;
  }

  if (req.method === 'GET') {
    const url = new URL(req.url || '', 'http://localhost');
    const learnerId = url.searchParams.get('learnerId');
    const db = await loadDb();
    const record = learnerId ? db[learnerId] || {} : {};
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(record));
    return;
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET,POST,OPTIONS');
  res.end('Method not allowed');
}

