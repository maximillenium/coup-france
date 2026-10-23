import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import apiRouter from '../src/server/routes.ts';
import { db, DatabaseService, createDatabaseService } from '../src/server/db.ts';
import { resetLoginAttempts, hashPassword } from '../src/server/auth.ts';

async function runSecurityAuditTests() {
  console.log('====================================================');
  console.log('🚀 STARTING COUPFRANC AUTOMATED SECURITY AUDIT TESTS');
  console.log('====================================================');

  // Create isolated temp sandbox
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coupfranc-sec-test-'));
  const tempDbFile = path.join(tempDir, 'database.json');
  const tempUploadsDir = path.join(tempDir, 'uploads');
  fs.mkdirSync(tempUploadsDir, { recursive: true });

  const srcDbFile = path.resolve(process.cwd(), 'data', 'database.json');
  if (fs.existsSync(srcDbFile)) {
    fs.copyFileSync(srcDbFile, tempDbFile);
  }

  process.env.DATA_DIR = tempDir;
  process.env.DB_FILE = tempDbFile;
  process.env.UPLOADS_DIR = tempUploadsDir;
  process.env.JWT_SECRET = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

  db.reloadFromDisk(tempDbFile);
  const testDb = createDatabaseService(tempDbFile);
  const adminUser = testDb.findUserByEmail('admin');
  if (adminUser) {
    testDb.updateUserPassword(adminUser.id, hashPassword('123123'));
  }
  db.reloadFromDisk(tempDbFile);
  resetLoginAttempts('127.0.0.1');
  resetLoginAttempts('198.51.100.99');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[TEST SERVER] Running on ${baseUrl} (Isolated DB: ${tempDbFile})`);

  let testsPassed = 0;
  let testsFailed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      testsPassed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      testsFailed++;
    }
  }

  try {
    // 1. Security Headers
    await test('Security Headers (nosniff, frame-options, no x-powered-by)', async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.strictEqual(res.headers.get('x-powered-by'), null);
    });

    // 2. Unauthenticated Protected API Access
    await test('GET /api/admin/stats without authentication returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error);
    });

    await test('POST /api/bookmakers without authentication returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/bookmakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'HackerBet', slug: 'hacker-bet' }),
      });
      assert.strictEqual(res.status, 401);
    });

    await test('POST /api/upload without authentication returns 401', async () => {
      const formData = new FormData();
      const blob = new Blob(['sample data'], { type: 'image/png' });
      formData.append('image', blob, 'sample.png');
      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      assert.strictEqual(res.status, 401);
    });

    // 3. Login Authentication & Generic Error Response
    await test('POST /api/auth/login with wrong password returns 401 generic error', async () => {
      resetLoginAttempts('127.0.0.1');
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: 'wrong-password-999' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Identifiants invalides.');
    });

    await test('POST /api/auth/login with non-existent user returns same generic 401', async () => {
      resetLoginAttempts('127.0.0.1');
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fakeuser@nowhere.com', password: 'randompassword' }),
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, 'Identifiants invalides.');
    });

    // 4. Rate Limiting Brute Force Protection
    await test('Rate limiter triggers 429 after 5 failed login attempts', async () => {
      const testIp = '198.51.100.99';
      resetLoginAttempts(testIp);
      for (let i = 0; i < 5; i++) {
        await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': testIp },
          body: JSON.stringify({ email: 'admin', password: `invalid-attempt-${i}` }),
        });
      }
      // 6th attempt must be rejected with 429
      const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-real-ip': testIp },
        body: JSON.stringify({ email: 'admin', password: 'any' }),
      });
      assert.strictEqual(blockedRes.status, 429);
      const data = await blockedRes.json();
      assert.ok(data.error.includes('Trop de tentatives'));
      resetLoginAttempts(testIp);
    });

    // 5. Valid Administrator Login & Session Cookie (No Token Leak in JSON)
    let authCookie = '';
    await test('POST /api/auth/login with valid credentials sets HttpOnly cookie and omits JSON token', async () => {
      resetLoginAttempts('127.0.0.1');
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: '123123' }),
      });
      assert.strictEqual(res.status, 200);
      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader && cookieHeader.includes('auth_token'));
      assert.ok(cookieHeader.includes('HttpOnly') || cookieHeader.includes('httponly'));

      authCookie = cookieHeader.split(';')[0];
      const data = await res.json();
      assert.strictEqual(data.user.email, 'admin');
      assert.strictEqual(data.user.role, 'admin');
      assert.strictEqual(data.token, undefined, 'JSON response MUST NOT leak the raw JWT token');
    });

    // 6. Accessing Protected Route with Cookie
    await test('GET /api/admin/stats with HttpOnly auth cookie succeeds', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(res.status, 200);
      const stats = await res.json();
      assert.ok(typeof stats.bookmakersCount === 'number');
    });

    // 7. Draft Protection: Unauthenticated Visitors cannot view Drafts
    await test('Draft entities are hidden from unauthenticated visitors', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookmakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Draft Secret Bookmaker',
          slug: 'draft-secret-bm',
          logo: 'https://example.com/logo.png',
          rating: 4.2,
          bonusSummary: 'Secret',
          promoCode: 'SECRET',
          affiliateUrl: 'https://example.com',
          ctaLabel: 'Test',
          offerTerms: 'Terms',
          shortDescription: 'Short',
          fullDescription: 'Full',
          features: ['Feature'],
          depositMethods: ['Visa'],
          withdrawalMethods: ['Visa'],
          minDeposit: '5€',
          isFeatured: false,
          status: 'draft',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const createdBm = await createRes.json();

      // Guest query
      const guestAllRes = await fetch(`${baseUrl}/api/bookmakers?all=true`);
      const guestList = await guestAllRes.json();
      assert.strictEqual(guestList.find((b: any) => b.id === createdBm.id), undefined);

      // Clean up
      await fetch(`${baseUrl}/api/bookmakers/${createdBm.id}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });
    });

    // 8. Upload Security: SVG Disallowed, Spoofed MIME Rejected, Real PNG Accepted
    await test('SVG upload is prohibited and rejected with 400', async () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>`;
      const formData = new FormData();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      formData.append('image', blob, 'test.svg');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Cookie: authCookie },
        body: formData,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('SVG non autorisé'));
    });

    await test('Spoofed file (text renamed as image/png) is rejected by binary byte signature check', async () => {
      const fakePngContent = 'THIS IS A TEXT FILE RENAMED TO PNG';
      const formData = new FormData();
      const blob = new Blob([fakePngContent], { type: 'image/png' });
      formData.append('image', blob, 'malformed.png');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Cookie: authCookie },
        body: formData,
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('signature binaire ne correspond pas'));
    });

    await test('Authentic PNG file upload succeeds with magic byte validation', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const formData = new FormData();
      const blob = new Blob([pngBuffer], { type: 'image/png' });
      formData.append('image', blob, 'valid.png');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Cookie: authCookie },
        body: formData,
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.url.startsWith('/uploads/'));
    });

    // 9. Password Change Workflow
    await test('Admin password change workflow in isolated sandbox', async () => {
      const changeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          currentPassword: '123123',
          newPassword: 'IsolatedPassword2026!',
        }),
      });
      assert.strictEqual(changeRes.status, 200);

      // Old password fails
      resetLoginAttempts('127.0.0.1');
      const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: '123123' }),
      });
      assert.strictEqual(oldLogin.status, 401);

      // New password succeeds
      const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: 'IsolatedPassword2026!' }),
      });
      assert.strictEqual(newLogin.status, 200);
    });

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log('====================================================');
  console.log(`AUDIT TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
