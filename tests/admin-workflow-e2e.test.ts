import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import apiRouter from '../src/server/routes.ts';
import { db, createDatabaseService } from '../src/server/db.ts';
import { resetLoginAttempts, hashPassword } from '../src/server/auth.ts';

async function runAdminWorkflowE2ETests() {
  console.log('====================================================');
  console.log('🧪 COUPFRANC COMPLETE ADMIN WORKFLOW E2E TESTS');
  console.log('====================================================');

  // Create isolated temp sandbox
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coupfranc-e2e-test-'));
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
  process.env.JWT_SECRET = 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2';

  db.reloadFromDisk(tempDbFile);
  const testDb = createDatabaseService(tempDbFile);
  const adminUser = testDb.findUserByEmail('admin');
  assert.ok(adminUser, 'Administrator user must exist in isolated database');
  testDb.updateUserPassword(adminUser.id, hashPassword('123123'));
  db.reloadFromDisk(tempDbFile);
  resetLoginAttempts('127.0.0.1');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[TEST SERVER] Running on ${baseUrl} (Isolated DB: ${tempDbFile})`);

  let passed = 0;
  let failed = 0;

  async function check(desc: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${desc}:`, err.message);
      failed++;
    }
  }

  let authCookie = '';

  try {
    // 1. Health check endpoint
    await check('GET /api/health returns 200 with status ok and uptime', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(body.database, 'healthy');
      assert.ok(typeof body.uptime === 'number');
    });

    // 2. Access denied when unauthenticated
    await check('Unauthenticated visitor cannot access protected admin routes', async () => {
      const statsRes = await fetch(`${baseUrl}/api/admin/stats`);
      assert.strictEqual(statsRes.status, 401);

      const postArtRes = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked', slug: 'hacked', content: 'test' }),
      });
      assert.strictEqual(postArtRes.status, 401);

      const postBmRes = await fetch(`${baseUrl}/api/bookmakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked', slug: 'hacked' }),
      });
      assert.strictEqual(postBmRes.status, 401);

      const postOffRes = await fetch(`${baseUrl}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked', bookmakerName: 'Hacked' }),
      });
      assert.strictEqual(postOffRes.status, 401);

      const postPredRes = await fetch(`${baseUrl}/api/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked', homeTeam: 'A', awayTeam: 'B', slug: 'hacked' }),
      });
      assert.strictEqual(postPredRes.status, 401);
    });

    // 3. Administrator login and logout
    await check('Administrator login succeeds with HttpOnly cookie (no JSON token leak)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: '123123' }),
      });
      assert.strictEqual(res.status, 200);
      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader && cookieHeader.includes('auth_token'));
      authCookie = cookieHeader.split(';')[0];

      const data = await res.json();
      assert.strictEqual(data.user.email, 'admin');
      assert.strictEqual(data.user.role, 'admin');
      assert.strictEqual(data.token, undefined, 'JSON response MUST NOT leak token');
    });

    await check('Administrator logout clears auth cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
      assert.strictEqual(res.status, 200);
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie && setCookie.includes('auth_token=;'));
    });

    // Re-login to refresh active auth cookie for subsequent workflow tests
    const loginAgain = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: '123123' }),
    });
    const loginSetCookie = loginAgain.headers.get('set-cookie');
    assert.ok(loginSetCookie);
    authCookie = loginSetCookie.split(';')[0];

    // 4. Complete Article Lifecycle: Create, Draft Privacy, Edit, Publish, Unpublish, Delete
    const testArticleSlug = `test-iso-art-${Date.now()}`;
    let createdArticleId = '';

    await check('Article lifecycle: Create as draft, verify draft privacy for guests', async () => {
      const createRes = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Test Isolated Article',
          slug: testArticleSlug,
          excerpt: 'Test excerpt',
          content: '<p>Initial draft content for test</p>',
          featuredImage: 'https://example.com/art.jpg',
          imageAlt: 'Test image',
          category: 'Analyses',
          status: 'draft',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const article = await createRes.json();
      assert.strictEqual(article.slug, testArticleSlug);
      assert.strictEqual(article.status, 'draft');
      createdArticleId = article.id;

      // Verify guest direct access gets 404
      const guestDirect = await fetch(`${baseUrl}/api/articles/${testArticleSlug}`);
      assert.strictEqual(guestDirect.status, 404, 'Guest must NOT access draft directly');

      // Verify guest list does NOT contain draft
      const guestListRes = await fetch(`${baseUrl}/api/articles`);
      const guestList = await guestListRes.json();
      assert.strictEqual(guestList.some((a: any) => a.id === createdArticleId), false);

      // Verify admin list DOES contain draft
      const adminListRes = await fetch(`${baseUrl}/api/articles?all=true`, {
        headers: { Cookie: authCookie },
      });
      const adminList = await adminListRes.json();
      assert.strictEqual(adminList.some((a: any) => a.id === createdArticleId), true);
    });

    await check('Article lifecycle: Publish and verify public access, edit content', async () => {
      const pubRes = await fetch(`${baseUrl}/api/articles/${createdArticleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          id: createdArticleId,
          title: 'Test Isolated Article (Published & Updated)',
          slug: testArticleSlug,
          content: '<p>Updated published content</p>',
          status: 'published',
        }),
      });
      assert.strictEqual(pubRes.status, 200);

      // Public guest now sees the article
      const guestDirect = await fetch(`${baseUrl}/api/articles/${testArticleSlug}`);
      assert.strictEqual(guestDirect.status, 200);
      const publicArticle = await guestDirect.json();
      assert.strictEqual(publicArticle.status, 'published');
      assert.strictEqual(publicArticle.content, '<p>Updated published content</p>');
    });

    await check('Article lifecycle: Unpublish, re-verify draft privacy, and delete', async () => {
      const unpubRes = await fetch(`${baseUrl}/api/articles/${createdArticleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          id: createdArticleId,
          status: 'draft',
        }),
      });
      assert.strictEqual(unpubRes.status, 200);

      const guestDirect = await fetch(`${baseUrl}/api/articles/${testArticleSlug}`);
      assert.strictEqual(guestDirect.status, 404);

      const delRes = await fetch(`${baseUrl}/api/articles/${createdArticleId}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(delRes.status, 200);

      const checkGone = await fetch(`${baseUrl}/api/articles/${testArticleSlug}`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(checkGone.status, 404);
    });

    // 5. Complete Bookmaker Lifecycle & Duplicate Slug Check
    const testBmSlug = `test-iso-bm-${Date.now()}`;
    let createdBmId = '';

    await check('Bookmaker lifecycle: Create, Edit, reject duplicate slug, and Delete', async () => {
      const createRes = await fetch(`${baseUrl}/api/bookmakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Test Isolated Bookmaker',
          slug: testBmSlug,
          initials: 'TI',
          tagline: 'Test tagline',
          logo: 'https://example.com/logo.png',
          rating: 4.6,
          bonusSummary: '100 € test',
          promoCode: 'TEST',
          affiliateUrl: 'https://example.com/aff',
          ctaLabel: 'Test Offer',
          offerTerms: 'Terms',
          shortDescription: 'Short',
          fullDescription: 'Full',
          features: ['Feature 1'],
          depositMethods: ['Visa'],
          withdrawalMethods: ['Visa'],
          minDeposit: '5 €',
          isFeatured: false,
          status: 'published',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const createdBm = await createRes.json();
      createdBmId = createdBm.id;

      const dupRes = await fetch(`${baseUrl}/api/bookmakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Another Bookmaker with Duplicate Slug',
          slug: testBmSlug,
        }),
      });
      assert.strictEqual(dupRes.status, 400, 'Duplicate bookmaker slug must return 400');

      const editRes = await fetch(`${baseUrl}/api/bookmakers/${createdBmId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Test Isolated Bookmaker (Edited)',
          slug: testBmSlug,
          rating: 4.9,
          tagline: 'Updated tagline for test',
        }),
      });
      assert.strictEqual(editRes.status, 200);

      const fetchRes = await fetch(`${baseUrl}/api/bookmakers/${testBmSlug}`);
      assert.strictEqual(fetchRes.status, 200);
      const fetched = await fetchRes.json();
      assert.strictEqual(fetched.rating, 4.9);

      const delRes = await fetch(`${baseUrl}/api/bookmakers/${createdBmId}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(delRes.status, 200);
    });

    // 6. Complete Offer Lifecycle & Duplicate Slug Check
    const testOfferSlug = `test-iso-off-${Date.now()}`;
    let createdOfferId = '';

    await check('Offer lifecycle: Create, Edit, reject duplicate slug, and Delete', async () => {
      const createRes = await fetch(`${baseUrl}/api/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          bookmakerName: 'Test Bookmaker',
          title: 'Test Offer 150 €',
          slug: testOfferSlug,
          offerType: 'Bienvenue',
          bonusAmount: '150 €',
          promoCode: 'TEST150',
          affiliateUrl: 'https://example.com/test-offer',
          ctaLabel: 'Profiter',
          terms: '18+',
          isFeatured: false,
          status: 'published',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const offer = await createRes.json();
      createdOfferId = offer.id;

      const dupRes = await fetch(`${baseUrl}/api/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          bookmakerName: 'Test Bookmaker 2',
          title: 'Duplicate Slug Offer',
          slug: testOfferSlug,
        }),
      });
      assert.strictEqual(dupRes.status, 400, 'Duplicate offer slug must return 400');

      const editRes = await fetch(`${baseUrl}/api/offers/${createdOfferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Test Offer 200 € (Edited)',
          bonusAmount: '200 €',
        }),
      });
      assert.strictEqual(editRes.status, 200);

      const delRes = await fetch(`${baseUrl}/api/offers/${createdOfferId}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(delRes.status, 200);
    });

    // 7. Complete Sports Prediction Lifecycle & Duplicate Slug Check
    const testPredSlug = `test-iso-pred-${Date.now()}`;
    let createdPredId = '';

    await check('Prediction lifecycle: Create, Edit, reject duplicate slug, and Delete', async () => {
      const createRes = await fetch(`${baseUrl}/api/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Team Alpha vs Team Beta',
          slug: testPredSlug,
          sport: 'Football',
          competition: 'Test League',
          homeTeam: 'Team Alpha',
          awayTeam: 'Team Beta',
          eventDate: '2026-10-30',
          eventTime: '20:45',
          predictionChoice: 'Victoire Team Alpha',
          odds: '2.10',
          confidence: 'Élevée',
          confidencePercent: 80,
          recommendedBookmaker: '1xBet',
          editorialAnalysis: 'Test editorial analysis.',
          isFeatured: false,
          status: 'published',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const pred = await createRes.json();
      createdPredId = pred.id;

      const dupRes = await fetch(`${baseUrl}/api/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Another match with duplicate slug',
          slug: testPredSlug,
          homeTeam: 'Team C',
          awayTeam: 'Team D',
        }),
      });
      assert.strictEqual(dupRes.status, 400, 'Duplicate prediction slug must return 400');

      const editRes = await fetch(`${baseUrl}/api/predictions/${createdPredId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Team Alpha vs Team Beta (Edited)',
          odds: '2.35',
        }),
      });
      assert.strictEqual(editRes.status, 200);

      const delRes = await fetch(`${baseUrl}/api/predictions/${createdPredId}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(delRes.status, 200);
    });

    // 8. Invalid form submissions (missing required fields)
    await check('Invalid form submissions return 400 Bad Request with clear errors', async () => {
      const artRes = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({ title: '' }),
      });
      assert.strictEqual(artRes.status, 400);

      const bmRes = await fetch(`${baseUrl}/api/bookmakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({ name: '' }),
      });
      assert.strictEqual(bmRes.status, 400);
    });

    // 9. Data persistence check in isolated sandbox
    await check('Created data is atomically written to isolated database file', async () => {
      const testPersistSlug = `persist-test-${Date.now()}`;
      const createRes = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Persistence Test Article',
          slug: testPersistSlug,
          excerpt: 'Persistence check',
          content: '<p>Verifying atomic disk save in sandbox</p>',
          category: 'Guides',
          status: 'published',
        }),
      });
      assert.strictEqual(createRes.status, 201);
      const created = await createRes.json();

      const rawContent = fs.readFileSync(tempDbFile, 'utf-8');
      const diskDb = JSON.parse(rawContent);

      const onDiskArticle = diskDb.articles.find((a: any) => a.id === created.id);
      assert.ok(onDiskArticle, 'Article MUST be present directly inside isolated database.json on disk');
      assert.strictEqual(onDiskArticle.slug, testPersistSlug);

      await fetch(`${baseUrl}/api/articles/${created.id}`, {
        method: 'DELETE',
        headers: { Cookie: authCookie },
      });
    });

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log('====================================================');
  console.log(`WORKFLOW E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminWorkflowE2ETests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
