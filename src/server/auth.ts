import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';

export const MIN_JWT_SECRET_LENGTH = 32;

const KNOWN_INSECURE_SECRETS = new Set([
  'generate-a-strong-32-char-random-jwt-secret-string',
  'coupfranc-jwt-secure-signing-key-vps-2026',
  'remplacez-cette-cle-par-une-chaine-aleatoire-securisee-de-32-caracteres',
  'your-secret-key-here-minimum-32-characters-long',
  'changethispasswordsecurely!',
  '12345678901234567890123456789012',
  'secret',
  'admin',
  'password',
]);

/**
 * Validates production environment configuration.
 * Fails fast with clear, safe error messages without printing secret values.
 */
export function validateEnvironment(): void {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret || secret.trim().length === 0) {
    if (isProduction) {
      throw new Error(
        '[FATAL CONFIG ERROR] JWT_SECRET environment variable is missing or empty. ' +
        'In production, JWT_SECRET is strictly required and must be provided via the server environment (.env). ' +
        'Generate a strong random secret with: openssl rand -hex 32'
      );
    } else {
      // In development / test mode without explicit JWT_SECRET, provision an ephemeral dev secret
      process.env.JWT_SECRET = 'coupfranc_dev_ephemeral_jwt_secret_32_characters_minimum';
      return;
    }
  }

  const trimmed = secret.trim();

  if (trimmed.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `[FATAL CONFIG ERROR] JWT_SECRET is too short (${trimmed.length} characters). ` +
      `It must be at least ${MIN_JWT_SECRET_LENGTH} characters long to ensure cryptographic security. ` +
      'Generate a strong secret with: openssl rand -hex 32'
    );
  }

  if (KNOWN_INSECURE_SECRETS.has(trimmed.toLowerCase())) {
    throw new Error(
      '[FATAL CONFIG ERROR] JWT_SECRET matches a known public placeholder or insecure default. ' +
      'Production environments must use a unique cryptographically random secret. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
}

export function getJwtSecret(): string {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    validateEnvironment();
  }
  return process.env.JWT_SECRET!;
}

export const MIN_TRUST_PROXY_HOPS = 0;
export const MAX_TRUST_PROXY_HOPS = 10;

/**
 * Validates the TRUST_PROXY_HOPS environment variable.
 * Strictly requires the entire string to be a non-negative integer between 0 and 10.
 * Rejects malformed values immediately to prevent reverse proxy header spoofing.
 */
export function parseTrustProxyHops(val?: string): number {
  if (val === undefined || val === null || val === '') {
    // Default to 1 (standard single Nginx reverse proxy on the VPS host)
    return 1;
  }

  const trimmed = val.trim();
  // Strictly validate the ENTIRE string is digits only (rejects "1abc", "-1", "true", "1.5", etc.)
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `[FATAL CONFIG ERROR] Invalid TRUST_PROXY_HOPS="${val}". ` +
      `Value must be a non-negative integer between ${MIN_TRUST_PROXY_HOPS} and ${MAX_TRUST_PROXY_HOPS}. ` +
      'Do not use arbitrary strings or decimals.'
    );
  }

  const hops = Number.parseInt(trimmed, 10);
  if (hops < MIN_TRUST_PROXY_HOPS || hops > MAX_TRUST_PROXY_HOPS) {
    throw new Error(
      `[FATAL CONFIG ERROR] TRUST_PROXY_HOPS=${hops} is outside the supported range [${MIN_TRUST_PROXY_HOPS}, ${MAX_TRUST_PROXY_HOPS}]. ` +
      'Specify the exact number of trusted reverse-proxy hops matching your deployment topology.'
    );
  }

  return hops;
}

const TOKEN_EXPIRY = '7d';

interface RateLimitRecord {
  count: number;
  lastAttempt: number;
  lockoutUntil?: number;
}

const MAX_RATE_LIMIT_ENTRIES = 5000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes sliding window

/**
 * Robust Bounded In-Memory Login Rate Limiter for Single-Instance VPS deployments.
 *
 * Characteristics & Design:
 * - Bounded memory (max 5,000 entries) prevents memory exhaustion (DoS) from IP-spoofing floods.
 * - Automatic periodic pruning cleans up expired records every 5 minutes.
 * - Sliding lockout window locks out after 5 failed attempts for 15 minutes.
 * - Limitation note: For horizontal multi-instance deployments behind a cluster load balancer,
 *   a distributed store such as Redis would be required. For a single VPS host, this is ideal
 *   due to zero network latency and low resource overhead.
 */
export class LoginRateLimiter {
  private attempts = new Map<string, RateLimitRecord>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      this.prune();
    }, 5 * 60 * 1000);
    if (this.cleanupTimer && this.cleanupTimer.unref) {
      this.cleanupTimer.unref(); // Ensure timer does not prevent process exit in tests
    }
  }

  check(ip: string): { allowed: boolean; remainingSeconds?: number } {
    const record = this.attempts.get(ip);
    const now = Date.now();

    if (!record) {
      return { allowed: true };
    }

    if (record.lockoutUntil && record.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
      return { allowed: false, remainingSeconds };
    }

    // If window expired and not locked out, reset
    if (now - record.lastAttempt > ATTEMPT_WINDOW_MS) {
      this.attempts.delete(ip);
      return { allowed: true };
    }

    if (record.count >= MAX_ATTEMPTS) {
      record.lockoutUntil = now + LOCKOUT_PERIOD_MS;
      const remainingSeconds = Math.ceil(LOCKOUT_PERIOD_MS / 1000);
      return { allowed: false, remainingSeconds };
    }

    return { allowed: true };
  }

  recordFailed(ip: string): void {
    const now = Date.now();
    const record = this.attempts.get(ip);

    if (record) {
      if (now - record.lastAttempt > ATTEMPT_WINDOW_MS) {
        record.count = 1;
      } else {
        record.count += 1;
      }
      record.lastAttempt = now;
      if (record.count >= MAX_ATTEMPTS) {
        record.lockoutUntil = now + LOCKOUT_PERIOD_MS;
      }
    } else {
      if (this.attempts.size >= MAX_RATE_LIMIT_ENTRIES) {
        this.pruneOldest(1000);
      }
      this.attempts.set(ip, { count: 1, lastAttempt: now });
    }
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }

  prune(): void {
    const now = Date.now();
    for (const [ip, record] of this.attempts.entries()) {
      const isLocked = record.lockoutUntil && record.lockoutUntil > now;
      const isStale = now - record.lastAttempt > ATTEMPT_WINDOW_MS;
      if (!isLocked && isStale) {
        this.attempts.delete(ip);
      }
    }
  }

  private pruneOldest(count: number): void {
    let removed = 0;
    for (const key of this.attempts.keys()) {
      this.attempts.delete(key);
      removed++;
      if (removed >= count) break;
    }
  }

  clear(): void {
    this.attempts.clear();
  }
}

export const rateLimiter = new LoginRateLimiter();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  return rateLimiter.check(ip);
}

export function recordFailedLogin(ip: string): void {
  rateLimiter.recordFailed(ip);
}

export function resetLoginAttempts(ip: string): void {
  rateLimiter.reset(ip);
}

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function getClientIp(req: Request): string {
  const trustHops = parseTrustProxyHops(process.env.TRUST_PROXY_HOPS);

  // When TRUST_PROXY_HOPS is 0, do not trust any client-forwarded proxy headers
  if (trustHops === 0) {
    let ip = req.socket?.remoteAddress || '127.0.0.1';
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
  }

  // 1. If Nginx sets X-Real-IP ($remote_addr), this cannot be spoofed by downstream clients
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    let ip = realIp.trim();
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
  }

  // 2. Use Express-evaluated req.ip (strictly respects app.set('trust proxy', trustHops))
  if (req.ip) {
    let ip = req.ip;
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
  }

  // 3. Fallback to raw socket (never trust raw unparsed client headers)
  let ip = req.socket?.remoteAddress || '127.0.0.1';
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
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string; role: string };
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
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string; role: string };
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
