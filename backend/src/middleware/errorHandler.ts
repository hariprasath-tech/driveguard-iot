import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
    });
  }

  const error = err as Error;
  console.error('Unhandled Application Error:', error.message || error);

  return res.status(500).json({
    error: 'Internal server error'
  });
}
