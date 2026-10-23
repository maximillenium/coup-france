import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  validateEnvironment,
  parseTrustProxyHops,
  getClientIp,
  MIN_JWT_SECRET_LENGTH,
} from '../src/server/auth.ts';
import { detectImageFormat } from '../src/server/routes.ts';
import { validateProductionCredentials } from '../src/server/db.ts';

async function runConfigHardeningTests() {
  console.log('====================================================');
  console.log('🔒 COUPFRANC CONFIGURATION HARDENING TESTS');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  const originalEnv = { ...process.env };

  function restoreEnv() {
    process.env = { ...originalEnv };
  }

  // 1. Production fails fast if JWT_SECRET is missing or empty
  await test('validateEnvironment throws in production if JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    assert.throws(
      () => validateEnvironment(),
      /JWT_SECRET environment variable is missing or empty/
    );
    restoreEnv();
  });

  await test('validateEnvironment throws in production if JWT_SECRET is empty string', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '   ';
    assert.throws(
      () => validateEnvironment(),
      /JWT_SECRET environment variable is missing or empty/
    );
    restoreEnv();
  });

  // 2. Secret length validation (< 32 characters)
  await test('validateEnvironment throws if JWT_SECRET is shorter than 32 characters', () => {
    process.env.NODE_ENV = 'production';
    const shortSecret = 'short_secret_only_24_chr';
    process.env.JWT_SECRET = shortSecret;

    assert.throws(
      () => validateEnvironment(),
      (err: any) => {
        assert.ok(err.message.includes(`${MIN_JWT_SECRET_LENGTH} characters long`));
        assert.strictEqual(err.message.includes(shortSecret), false, 'Error message must NOT leak secret!');
        return true;
      }
    );
    restoreEnv();
  });

  // 3. Known predictable / public placeholder rejection
  await test('validateEnvironment rejects known predictable placeholder secrets', () => {
    const knownInsecure = [
      'generate-a-strong-32-char-random-jwt-secret-string',
      'coupfranc-jwt-secure-signing-key-vps-2026',
      'remplacez-cette-cle-par-une-chaine-aleatoire-securisee-de-32-caracteres',
    ];

    for (const placeholder of knownInsecure) {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = placeholder;
      assert.throws(
        () => validateEnvironment(),
        /JWT_SECRET matches a known public placeholder/,
        `Should reject placeholder: ${placeholder}`
      );
      restoreEnv();
    }
  });

  // 4. Valid 32+ character random secret succeeds
  await test('validateEnvironment succeeds with strong 64-char hex secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'e4b1c2d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1';
    assert.doesNotThrow(() => validateEnvironment());
    restoreEnv();
  });

  // 5. Strict parseTrustProxyHops validation
  await test('parseTrustProxyHops accepts valid non-negative integers 0-10', () => {
    assert.strictEqual(parseTrustProxyHops(undefined), 1, 'Default when undefined must be 1');
    assert.strictEqual(parseTrustProxyHops(''), 1, 'Default when empty must be 1');
    assert.strictEqual(parseTrustProxyHops('0'), 0, 'Must allow 0 hops when explicitly set');
    assert.strictEqual(parseTrustProxyHops('1'), 1, 'Must parse 1 hop');
    assert.strictEqual(parseTrustProxyHops('2'), 2, 'Must parse 2 hops');
    assert.strictEqual(parseTrustProxyHops('10'), 10, 'Must parse 10 hops');
  });

  await test('parseTrustProxyHops strictly rejects malformed and out-of-range inputs', () => {
    const invalidInputs = ['1abc', '-1', '1.5', 'abc', 'true', '99', '1000'];
    for (const invalid of invalidInputs) {
      assert.throws(
        () => parseTrustProxyHops(invalid),
        /FATAL CONFIG ERROR/,
        `Should throw for invalid input: ${invalid}`
      );
    }
  });

  // 6. getClientIp does not trust proxy headers when TRUST_PROXY_HOPS=0
  await test('getClientIp strictly ignores X-Forwarded-For and X-Real-IP when TRUST_PROXY_HOPS=0', () => {
    process.env.TRUST_PROXY_HOPS = '0';
    const fakeReq: any = {
      headers: {
        'x-real-ip': '203.0.113.199',
        'x-forwarded-for': '198.51.100.42',
      },
      socket: { remoteAddress: '10.0.0.5' },
    };
    const resolvedIp = getClientIp(fakeReq);
    assert.strictEqual(resolvedIp, '10.0.0.5', 'Must use socket.remoteAddress when TRUST_PROXY_HOPS=0');
    restoreEnv();
  });

  // 7. Binary image magic signature detection
  await test('detectImageFormat correctly identifies PNG, JPEG, WEBP and rejects text/SVG', () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    assert.strictEqual(detectImageFormat(pngBytes), 'png');

    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.strictEqual(detectImageFormat(jpegBytes), 'jpeg');

    const webpBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    assert.strictEqual(detectImageFormat(webpBytes), 'webp');

    const fakeTextBytes = Buffer.from('<?xml version="1.0"?><svg></svg>');
    assert.strictEqual(detectImageFormat(fakeTextBytes), null);
  });

  // 8. Production weak credential guard
  await test('validateProductionCredentials throws in production if admin user has weak password', () => {
    process.env.NODE_ENV = 'production';
    const weakUser = {
      id: 'usr_admin_1',
      email: 'admin',
      name: 'Admin',
      passwordHash: bcrypt.hashSync('123123', 10),
      role: 'admin' as const,
      createdAt: '2026-01-01T00:00:00Z',
    };

    assert.throws(
      () => validateProductionCredentials([weakUser]),
      /Production startup blocked: Administrator account is configured with a known, weak, or test password/
    );
    restoreEnv();
  });

  // 9. docker-compose.yml has no fallback for JWT_SECRET
  await test('docker-compose.yml contains no fallback for JWT_SECRET and enforces strict requirement', () => {
    const composeContent = fs.readFileSync(path.resolve(process.cwd(), 'docker-compose.yml'), 'utf-8');
    assert.ok(
      !composeContent.includes(':-generate-a-strong-32-char-random-jwt-secret-string'),
      'docker-compose.yml must not contain the insecure default fallback string'
    );
    assert.ok(
      composeContent.includes('JWT_SECRET=${JWT_SECRET:?'),
      'docker-compose.yml must use ${JWT_SECRET:?...} strict requirement syntax'
    );
  });

  // 10. .gitignore contains .env and no .env files are tracked
  await test('.gitignore properly excludes .env files', () => {
    const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf-8');
    assert.ok(gitignoreContent.includes('.env*') || gitignoreContent.includes('.env'));
    assert.ok(!fs.existsSync(path.resolve(process.cwd(), '.env')));
  });

  console.log('====================================================');
  console.log(`HARDENING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runConfigHardeningTests().catch((err) => {
  console.error('Fatal hardening test error:', err);
  process.exit(1);
});
