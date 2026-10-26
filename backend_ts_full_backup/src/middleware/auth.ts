import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privilege required' });
    }
    next();
  });
}

export function requireDeviceKey(req: Request, res: Response, next: NextFunction) {
  const providedKey = req.headers['x-device-key'];
  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({ error: 'Missing x-device-key header' });
  }

  const expectedKey = config.DEVICE_API_KEY;

  // Constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(expectedKey);

  if (providedBuffer.length !== expectedBuffer.length) {
    return res.status(401).json({ error: 'Unauthorized device key' });
  }

  const match = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  if (!match) {
    return res.status(401).json({ error: 'Unauthorized device key' });
  }

  next();
}
