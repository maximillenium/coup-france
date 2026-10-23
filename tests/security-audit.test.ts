import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import apiRouter from '../src/server/routes.ts';
import { db } from '../src/server/db.ts';
import { resetLoginAttempts, hashPassword } from '../src/server/auth.ts';

async function runSecurityAuditTests() {
  console.log('====================================================');
  console.log('🚀 STARTING COUPFRANC AUTOMATED SECURITY AUDIT TESTS');
  console.log('====================================================');

  // Ensure known baseline state for tests
  const adminUser = db.findUserByEmail('admin');
  if (adminUser) {
    db.updateUserPassword(adminUser.id, hashPassword('123123'));
  }
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
  console.log(`[TEST SERVER] Running on ${baseUrl}`);

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
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
        body: JSON.stringify({ email: 'admin', password: `invalid-attempt-${i}` }),
      });
    }
    // 6th attempt must be rejected with 429
    const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
      body: JSON.stringify({ email: 'admin', password: 'any' }),
    });
    assert.strictEqual(blockedRes.status, 429);
    const data = await blockedRes.json();
    assert.ok(data.error.includes('Trop de tentatives'));
    resetLoginAttempts(testIp);
  });

  // 5. Valid Administrator Login & Session Cookie
  let adminToken = '';
  await test('POST /api/auth/login with valid admin credentials succeeds with HttpOnly cookie', async () => {
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

    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.email, 'admin');
    assert.strictEqual(data.user.role, 'admin');
    adminToken = data.token;
  });

  // 6. Accessing Protected Route with Valid Token
  await test('GET /api/admin/stats with Bearer token succeeds', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const stats = await res.json();
    assert.ok(typeof stats.bookmakersCount === 'number');
    assert.ok(typeof stats.publishedArticlesCount === 'number');
  });

  // 7. Draft Protection: Unauthenticated Visitors cannot view Drafts
  await test('Draft entities are hidden from unauthenticated visitors (?all=true ignored for guests)', async () => {
    // 1. Create a draft bookmaker as admin
    const createRes = await fetch(`${baseUrl}/api/bookmakers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
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

    // 2. Query as guest with ?all=true
    const guestAllRes = await fetch(`${baseUrl}/api/bookmakers?all=true`);
    const guestList = await guestAllRes.json();
    const guestFound = guestList.find((b: any) => b.id === createdBm.id);
    assert.strictEqual(guestFound, undefined, 'Guest MUST NOT see draft bookmaker even with ?all=true');

    // 3. Query direct slug as guest
    const guestDirectRes = await fetch(`${baseUrl}/api/bookmakers/draft-secret-bm`);
    assert.strictEqual(guestDirectRes.status, 404, 'Guest direct access to draft slug MUST return 404');

    // 4. Query as admin with ?all=true
    const adminAllRes = await fetch(`${baseUrl}/api/bookmakers?all=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminList = await adminAllRes.json();
    const adminFound = adminList.find((b: any) => b.id === createdBm.id);
    assert.ok(adminFound, 'Admin MUST see draft bookmaker with ?all=true');

    // Clean up
    await fetch(`${baseUrl}/api/bookmakers/${createdBm.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // 8. Malicious SVG Upload Rejection (Stored XSS Protection)
  await test('Malicious SVG file with embedded script is rejected', async () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('XSS')</script><circle cx="50" cy="50" r="40"/></svg>`;
    const formData = new FormData();
    const blob = new Blob([maliciousSvg], { type: 'image/svg+xml' });
    formData.append('image', blob, 'malicious.svg');

    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('interdits'));
  });

  // 9. Clean Image Upload Success
  await test('Clean PNG file upload succeeds', async () => {
    // 1x1 transparent png
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const formData = new FormData();
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('image', blob, 'valid-test.png');

    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.url.startsWith('/uploads/'));

    // Clean up uploaded test artifact
    if (data.filename) {
      const filePath = path.resolve(process.cwd(), 'data', 'uploads', data.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  // 10. Content Sanitization (Article HTML Sanitization)
  await test('Article content strips malicious <script> tags on save', async () => {
    const dirtyHtml = '<p>Normal text</p><script>alert("hacked")</script><h2>Subtitle</h2><img src="x" onerror="alert(1)">';
    const res = await fetch(`${baseUrl}/api/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Audit Sanitization Article',
        slug: `audit-sanitization-${Date.now()}`,
        excerpt: 'Excerpt',
        content: dirtyHtml,
        featuredImage: 'https://example.com/pic.jpg',
        imageAlt: 'Pic',
        category: 'Analyses',
        status: 'draft',
      }),
    });
    assert.strictEqual(res.status, 201);
    const article = await res.json();
    assert.ok(!article.content.includes('<script>'));
    assert.ok(!article.content.includes('onerror='));
    assert.ok(article.content.includes('<p>Normal text</p>'));

    // Clean up
    await fetch(`${baseUrl}/api/articles/${article.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // 11. Password Change & Verification
  await test('Admin password change workflow', async () => {
    // 1. Change password to a new password
    const changeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: '123123',
        newPassword: 'NewSecurePassword2026!',
      }),
    });
    assert.strictEqual(changeRes.status, 200);

    // 2. Try login with old password -> must fail
    resetLoginAttempts('127.0.0.1');
    const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: '123123' }),
    });
    assert.strictEqual(oldLogin.status, 401);

    // 3. Login with new password -> must succeed
    const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: 'NewSecurePassword2026!' }),
    });
    assert.strictEqual(newLogin.status, 200);
    const newAuth = await newLogin.json();

    // 4. Revert password back to 123123 as requested by the user
    const revertRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newAuth.token}`,
      },
      body: JSON.stringify({
        currentPassword: 'NewSecurePassword2026!',
        newPassword: '123123',
      }),
    });
    assert.strictEqual(revertRes.status, 200);
  });

  // Close server
  await new Promise<void>((resolve) => server.close(() => resolve()));

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
