import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'coupfranc-jwt-secure-signing-key-vps-2026';
const TOKEN_EXPIRY = '7d';

// Rate limiter for login attempts (in-memory sliding window)
interface AttemptRecord {
  count: number;
  lastAttempt: number;
}
const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const record = loginAttempts.get(ip);
  const now = Date.now();

  if (!record) {
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const elapsed = now - record.lastAttempt;
    if (elapsed < LOCKOUT_PERIOD_MS) {
      const remainingSeconds = Math.ceil((LOCKOUT_PERIOD_MS - elapsed) / 1000);
      return { allowed: false, remainingSeconds };
    }
    // Lockout expired, reset
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record) {
    record.count += 1;
    record.lastAttempt = now;
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

export function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function getClientIp(req: Request): string {
  // 1. If Nginx sets X-Real-IP ($remote_addr), this cannot be spoofed by downstream clients
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    let ip = realIp.trim();
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
  }

  // 2. Use Express-evaluated req.ip (strictly respects app.set('trust proxy', ...))
  if (req.ip) {
    let ip = req.ip;
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
  }

  // 3. Fallback to X-Forwarded-For or raw socket
  let ip = req.headers['x-forwarded-for'];
  if (typeof ip === 'string') {
    ip = ip.split(',')[0].trim();
  } else {
    ip = req.socket?.remoteAddress || '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  return ip;
}

export function isUserAuthenticated(req: Request): boolean {
  let token: string | undefined = req.cookies?.auth_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = db.findUserById(decoded.id);
    return !!user;
  } catch {
    return false;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token: string | undefined = req.cookies?.auth_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Accès non autorisé. Authentification requise.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = db.findUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'Compte administrateur introuvable ou révoqué.' });
      return;
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expirée ou jeton invalide.' });
  }
}
