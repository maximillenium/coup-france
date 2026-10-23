import express, { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { db, getUploadsDir } from './db.ts';
import {
  authenticateToken,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  generateToken,
  verifyPassword,
  hashPassword,
  AuthenticatedRequest,
  getClientIp,
  isUserAuthenticated,
} from './auth.ts';

const router = express.Router();

export type AllowedImageType = 'png' | 'jpeg' | 'webp';

export function detectImageFormat(buffer: Buffer): AllowedImageType | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// Setup Multer for secure image uploads (strictly JPEG, PNG, WEBP)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getUploadsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.mimetype === 'image/svg+xml') {
      cb(new Error('Format SVG non autorisé. Seuls les formats JPEG, PNG et WEBP sont acceptés.'));
    } else if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non autorisé. Seuls les formats JPEG, PNG et WEBP sont acceptés.'));
    }
  },
});

// ==========================================
// 0. HEALTH CHECK (DOCKER / VPS MONITORING)
// ==========================================

router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: 'healthy',
  });
});

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

router.post('/api/auth/login', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rateLimit = checkLoginRateLimit(ip);

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: `Trop de tentatives de connexion échouées. Veuillez patienter ${rateLimit.remainingSeconds} secondes avant de réessayer.`,
    });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis.' });
    return;
  }

  const user = db.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordFailedLogin(ip);
    res.status(401).json({ error: 'Identifiants invalides.' });
    return;
  }

  // Success
  resetLoginAttempts(ip);
  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  // Set secure HTTP-only cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    message: 'Connexion réussie',
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

router.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ message: 'Déconnexion effectuée avec succès.' });
});

router.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }
  const user = db.findUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable' });
    return;
  }
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

router.post('/api/auth/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    return;
  }

  const user = db.findUserById(req.user.id);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
    return;
  }

  const newHash = hashPassword(newPassword);
  db.updateUserPassword(user.id, newHash);
  res.json({ message: 'Mot de passe mis à jour avec succès.' });
});

// ==========================================
// 2. DASHBOARD STATS
// ==========================================

router.get('/api/admin/stats', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.getStats());
});

// ==========================================
// 3. BOOKMAKERS ROUTES
// ==========================================

router.get('/api/bookmakers', (req: Request, res: Response) => {
  const wantsAll = req.query.all === 'true';
  const isAdmin = isUserAuthenticated(req);
  const publishedOnly = !(wantsAll && isAdmin);
  const list = db.getBookmakers(publishedOnly);
  res.json(list);
});

router.get('/api/bookmakers/:slug', (req: Request, res: Response) => {
  const item = db.getBookmakerBySlug(req.params.slug);
  if (!item || (item.status === 'draft' && !isUserAuthenticated(req))) {
    res.status(404).json({ error: 'Bookmaker introuvable' });
    return;
  }
  res.json(item);
});

router.post('/api/bookmakers', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  if (!data.name || !data.slug) {
    res.status(400).json({ error: 'Nom et slug requis.' });
    return;
  }
  const existing = db.getBookmakerBySlug(data.slug);
  if (existing) {
    res.status(400).json({ error: 'Un bookmaker avec ce slug existe déjà.' });
    return;
  }
  const newItem = {
    ...data,
    id: data.id || `bm_${Date.now()}`,
    rating: Number(data.rating) || 4.5,
  };
  const saved = db.saveBookmaker(newItem);
  res.status(201).json(saved);
});

router.put('/api/bookmakers/:id', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  data.id = req.params.id;
  if (data.slug) {
    const existing = db.getBookmakerBySlug(data.slug);
    if (existing && existing.id !== req.params.id) {
      res.status(400).json({ error: 'Un bookmaker avec ce slug existe déjà.' });
      return;
    }
  }
  const saved = db.saveBookmaker(data);
  res.json(saved);
});

router.delete('/api/bookmakers/:id', authenticateToken, (req: Request, res: Response) => {
  const success = db.deleteBookmaker(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Bookmaker introuvable ou déjà supprimé.' });
    return;
  }
  res.json({ message: 'Bookmaker supprimé avec succès.' });
});

// ==========================================
// 4. PROMOTIONAL OFFERS ROUTES
// ==========================================

router.get('/api/offers', (req: Request, res: Response) => {
  const wantsAll = req.query.all === 'true';
  const isAdmin = isUserAuthenticated(req);
  const publishedOnly = !(wantsAll && isAdmin);
  const list = db.getOffers(publishedOnly);
  res.json(list);
});

router.post('/api/offers', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  if (!data.title || !data.bookmakerName) {
    res.status(400).json({ error: 'Titre et bookmaker requis.' });
    return;
  }
  if (data.slug) {
    const existing = db.getOffers(false).find((o) => o.slug === data.slug);
    if (existing) {
      res.status(400).json({ error: 'Une offre avec ce slug existe déjà.' });
      return;
    }
  }
  const newItem = {
    ...data,
    id: data.id || `off_${Date.now()}`,
  };
  const saved = db.saveOffer(newItem);
  res.status(201).json(saved);
});

router.put('/api/offers/:id', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  data.id = req.params.id;
  if (data.slug) {
    const existing = db.getOffers(false).find((o) => o.slug === data.slug && o.id !== req.params.id);
    if (existing) {
      res.status(400).json({ error: 'Une offre avec ce slug existe déjà.' });
      return;
    }
  }
  const saved = db.saveOffer(data);
  res.json(saved);
});

router.delete('/api/offers/:id', authenticateToken, (req: Request, res: Response) => {
  const success = db.deleteOffer(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Offre introuvable.' });
    return;
  }
  res.json({ message: 'Offre supprimée avec succès.' });
});

// ==========================================
// 5. SPORTS PREDICTIONS ROUTES
// ==========================================

router.get('/api/predictions', (req: Request, res: Response) => {
  const wantsAll = req.query.all === 'true';
  const isAdmin = isUserAuthenticated(req);
  const publishedOnly = !(wantsAll && isAdmin);
  const list = db.getPredictions(publishedOnly);
  res.json(list);
});

router.get('/api/predictions/:slug', (req: Request, res: Response) => {
  const item = db.getPredictionBySlug(req.params.slug);
  if (!item || (item.status === 'draft' && !isUserAuthenticated(req))) {
    res.status(404).json({ error: 'Pronostic introuvable.' });
    return;
  }
  res.json(item);
});

router.post('/api/predictions', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  if (!data.title || !data.homeTeam || !data.awayTeam || !data.slug) {
    res.status(400).json({ error: 'Titre, équipes et slug requis.' });
    return;
  }
  const existing = db.getPredictionBySlug(data.slug);
  if (existing) {
    res.status(400).json({ error: 'Un pronostic avec ce slug existe déjà.' });
    return;
  }
  const newItem = {
    ...data,
    id: data.id || `pred_${Date.now()}`,
  };
  const saved = db.savePrediction(newItem);
  res.status(201).json(saved);
});

router.put('/api/predictions/:id', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  data.id = req.params.id;
  if (data.slug) {
    const existing = db.getPredictionBySlug(data.slug);
    if (existing && existing.id !== req.params.id) {
      res.status(400).json({ error: 'Un pronostic avec ce slug existe déjà.' });
      return;
    }
  }
  const saved = db.savePrediction(data);
  res.json(saved);
});

router.delete('/api/predictions/:id', authenticateToken, (req: Request, res: Response) => {
  const success = db.deletePrediction(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Pronostic introuvable.' });
    return;
  }
  res.json({ message: 'Pronostic supprimé avec succès.' });
});

// ==========================================
// 6. ARTICLES ROUTES
// ==========================================

router.get('/api/articles', (req: Request, res: Response) => {
  const wantsAll = req.query.all === 'true';
  const isAdmin = isUserAuthenticated(req);
  const publishedOnly = !(wantsAll && isAdmin);
  let list = db.getArticles(publishedOnly);
  if (req.query.category) {
    list = list.filter((a) => a.category.toLowerCase() === (req.query.category as string).toLowerCase());
  }
  res.json(list);
});

router.get('/api/articles/:slug', (req: Request, res: Response) => {
  const item = db.getArticleBySlug(req.params.slug);
  if (!item || (item.status === 'draft' && !isUserAuthenticated(req))) {
    res.status(404).json({ error: 'Article introuvable.' });
    return;
  }
  res.json(item);
});

router.post('/api/articles', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  if (!data.title || !data.slug || !data.content) {
    res.status(400).json({ error: 'Titre, slug et contenu requis.' });
    return;
  }
  const existing = db.getArticleBySlug(data.slug);
  if (existing) {
    res.status(400).json({ error: 'Un article avec ce slug existe déjà.' });
    return;
  }
  const newItem = {
    ...data,
    content: sanitizeRichHtml(data.content),
    id: data.id || `art_${Date.now()}`,
    publishedAt: data.status === 'published' ? (data.publishedAt || new Date().toISOString()) : '',
  };
  const saved = db.saveArticle(newItem);
  res.status(201).json(saved);
});

router.put('/api/articles/:id', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  data.id = req.params.id;
  if (data.slug) {
    const existing = db.getArticleBySlug(data.slug);
    if (existing && existing.id !== req.params.id) {
      res.status(400).json({ error: 'Un article avec ce slug existe déjà.' });
      return;
    }
  }
  if (data.content) {
    data.content = sanitizeRichHtml(data.content);
  }
  const saved = db.saveArticle(data);
  res.json(saved);
});

router.delete('/api/articles/:id', authenticateToken, (req: Request, res: Response) => {
  const success = db.deleteArticle(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Article introuvable.' });
    return;
  }
  res.json({ message: 'Article supprimé avec succès.' });
});

// ==========================================
// 7. CATEGORIES ROUTES
// ==========================================

router.get('/api/categories', (_req: Request, res: Response) => {
  res.json(db.getCategories());
});

router.post('/api/categories', authenticateToken, (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Nom de catégorie requis.' });
    return;
  }
  const categories = db.addCategory(name);
  res.status(201).json(categories);
});

// ==========================================
// 8. INFORMATIONAL PAGES ROUTES
// ==========================================

router.get('/api/pages', authenticateToken, (_req: Request, res: Response) => {
  res.json(db.getAllPages());
});

router.get('/api/pages/:slug', (req: Request, res: Response) => {
  const page = db.getPage(req.params.slug);
  if (!page) {
    res.status(404).json({ error: 'Page introuvable.' });
    return;
  }
  res.json(page);
});

router.put('/api/pages/:slug', authenticateToken, (req: Request, res: Response) => {
  const data = req.body;
  data.slug = req.params.slug;
  if (data.content) {
    data.content = sanitizeRichHtml(data.content);
  }
  const saved = db.savePage(data);
  res.json(saved);
});

// ==========================================
// 9. FILE UPLOAD ROUTE
// ==========================================

router.post('/api/upload', authenticateToken, (req: Request, res: Response) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Format de fichier non autorisé.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier transmis ou format non supporté.' });
      return;
    }

    // Binary magic bytes check on the uploaded file on disk
    try {
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(req.file.path, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      const detected = detectImageFormat(buffer);
      if (!detected) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({
          error: 'Contenu du fichier non valide : la signature binaire ne correspond pas à une image JPEG, PNG ou WEBP authentique.',
        });
        return;
      }

      const ext = path.extname(req.file.filename).toLowerCase();
      const validExtensions: Record<AllowedImageType, string[]> = {
        png: ['.png'],
        jpeg: ['.jpg', '.jpeg'],
        webp: ['.webp'],
      };

      if (!validExtensions[detected].includes(ext)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({
          error: "L'extension du fichier ne correspond pas au format binaire réel détecté.",
        });
        return;
      }
    } catch {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Erreur lors du contrôle de sécurité du fichier.' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      message: 'Image téléversée avec succès.',
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  });
});

// ==========================================
// 10. SEO: SITEMAP & ROBOTS
// ==========================================

router.get('/sitemap.xml', (_req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || 'https://coupfranc.fr';
  const bookmakers = db.getBookmakers(true);
  const predictions = db.getPredictions(true);
  const articles = db.getArticles(true);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/bookmakers</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/bonus</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/pronostics</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/actualites</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/a-propos</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/mentions-legales</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/politique-de-confidentialite</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/gestion-des-cookies</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/jeu-responsable</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

  bookmakers.forEach((b) => {
    xml += `
  <url>
    <loc>${baseUrl}/bookmakers/${b.slug}</loc>
    <lastmod>${b.updatedAt ? b.updatedAt.split('T')[0] : '2026-03-01'}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  predictions.forEach((p) => {
    xml += `
  <url>
    <loc>${baseUrl}/pronostics/${p.slug}</loc>
    <lastmod>${p.updatedAt ? p.updatedAt.split('T')[0] : '2026-03-01'}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  articles.forEach((a) => {
    xml += `
  <url>
    <loc>${baseUrl}/actualites/${a.slug}</loc>
    <lastmod>${a.updatedAt ? a.updatedAt.split('T')[0] : '2026-03-01'}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += `
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

router.get('/robots.txt', (_req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || 'https://coupfranc.fr';
  const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(content);
});

export default router;
