import type { Request, Response, NextFunction } from 'express';

export function lovableCors(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Origin', 'https://lovable.dev');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
