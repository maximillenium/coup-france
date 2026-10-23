import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Bookmaker, PromotionalOffer, SportsPrediction, Article, InformationalPage } from '../types/index.ts';

export interface AdminUserData {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'editor';
  createdAt: string;
}

export interface AppDatabase {
  bookmakers: Bookmaker[];
  offers: PromotionalOffer[];
  predictions: SportsPrediction[];
  articles: Article[];
  categories: string[];
  pages: Record<string, InformationalPage>;
  users: AdminUserData[];
}

export function getDataDir(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
}

export function getDbFilePath(): string {
  return process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(getDataDir(), 'database.json');
}

export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(getDataDir(), 'uploads');
}

export const KNOWN_WEAK_PASSWORDS = [
  '123123',
  'admin',
  'password',
  'admin123',
  '123456',
  '12345678',
  'coupfranc',
  'coupfranc2026',
];

export function validateProductionCredentials(users: AdminUserData[]): void {
  if (process.env.NODE_ENV !== 'production') return;

  const adminUsers = users.filter((u) => u.role === 'admin');
  if (adminUsers.length === 0) {
    throw new Error(
      '[FATAL CONFIG ERROR] No administrator account found. An admin account is required in production.'
    );
  }

  for (const admin of adminUsers) {
    for (const weak of KNOWN_WEAK_PASSWORDS) {
      if (bcrypt.compareSync(weak, admin.passwordHash)) {
        throw new Error(
          '[FATAL CONFIG ERROR] Production startup blocked: Administrator account is configured with a known, weak, or test password. ' +
          'You must change the administrator password before starting in production mode. ' +
          'Set a secure password via ADMIN_INITIAL_PASSWORD or update database.json.'
        );
      }
    }
  }
}

function getInitialAdminHash(): string {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (initialPassword && initialPassword.trim().length >= 10) {
    return bcrypt.hashSync(initialPassword.trim(), 10);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[FATAL CONFIG ERROR] In production, ADMIN_INITIAL_PASSWORD must be provided (min 10 characters) when creating an initial database.'
    );
  }
  // Development / test local fallback only
  return bcrypt.hashSync('123123', 10);
}

const INITIAL_DATABASE: AppDatabase = {
  users: [
    {
      id: 'usr_admin_1',
      email: 'admin',
      name: 'Администратор',
      passwordHash: '',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  categories: ['Guides', 'Analyses', 'Jeu responsable', 'Bookmakers'],
  bookmakers: [
    {
      id: 'bm_1xbet',
      name: '1xBet',
      slug: '1xbet',
      initials: '1X',
      tagline: 'Large catalogue de sports et marchés en direct',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=160&auto=format&fit=crop&q=80',
      rating: 4.8,
      bonusSummary: 'Offre de bienvenue [à confirmer]',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      offerTerms: "Offre réservée aux nouveaux inscrits majeurs (+18). Dépôt minimum de 1€. Exigence de mise 5x sur combinés. Conditions à vérifier sur le site officiel de l'opérateur selon votre pays de résidence.",
      shortDescription: "1xBet propose un large choix de disciplines sportives, des paris en direct et de nombreux moyens de paiement.",
      fullDescription: "1xBet propose un large choix de disciplines sportives, des paris en direct et de nombreux moyens de paiement. Cette fiche présente une description générale : les conditions précises de l'offre de bienvenue doivent être vérifiées sur le site de l'opérateur.",
      features: ['Paris en direct', 'Application mobile', 'Streaming'],
      sports: ['Football', 'Tennis', 'Basketball', 'eSport'],
      depositMethods: ['Visa / Mastercard', 'Virement bancaire', 'E-wallets', 'Crypto-monnaies'],
      withdrawalMethods: ['Virement bancaire', 'Portefeuilles électroniques'],
      minDeposit: '1 €',
      isFeatured: true,
      status: 'published',
      seoTitle: '1xBet : avis, offre et code promo | CoupFranc',
      seoDescription: 'Découvrez notre revue détaillée de 1xBet : bonus, cotes, application mobile et conditions du code promo.',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-03-01T12:00:00Z',
    },
    {
      id: 'bm_melbet',
      name: 'Melbet',
      slug: 'melbet',
      initials: 'MB',
      tagline: 'Interface claire et marchés variés',
      logo: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=160&auto=format&fit=crop&q=80',
      rating: 4.7,
      bonusSummary: 'Bonus sur premier dépôt [à confirmer]',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      offerTerms: "Réservé aux nouveaux joueurs 18+. Premier dépôt requis. Wager x5 en combinés. Conditions à vérifier sur le site de l'opérateur.",
      shortDescription: "Melbet met en avant une interface accessible, des marchés variés sur le football et les sports américains, ainsi qu'une section paris en direct.",
      fullDescription: "Melbet met en avant une interface accessible, des marchés variés sur le football et les sports américains, ainsi qu'une section paris en direct. Les montants et conditions de bonus restent à confirmer.",
      features: ['Paris en direct', 'Application mobile'],
      sports: ['Football', 'Basketball', 'Hockey'],
      depositMethods: ['Cartes bancaires', 'Paiement mobile', 'Perfect Money'],
      withdrawalMethods: ['Cartes bancaires', 'E-wallets'],
      minDeposit: '1.50 €',
      isFeatured: true,
      status: 'published',
      seoTitle: 'Melbet : avis, offre et code promo | CoupFranc',
      seoDescription: 'Tout savoir sur le bookmaker Melbet : cotes, offres promotionnelles et application mobile.',
      createdAt: '2026-01-12T14:30:00Z',
      updatedAt: '2026-03-05T09:15:00Z',
    },
    {
      id: 'bm_linebet',
      name: 'Linebet',
      slug: 'linebet',
      initials: 'LB',
      tagline: 'Opérateur orienté mobile',
      logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=160&auto=format&fit=crop&q=80',
      rating: 4.6,
      bonusSummary: "Offre d'inscription [à confirmer]",
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      offerTerms: "18+. Offre soumise aux conditions générales de Linebet. Un seul bonus par utilisateur.",
      shortDescription: "Linebet se positionne sur une expérience mobile simple, avec un accès rapide aux principaux championnats.",
      fullDescription: "Linebet se positionne sur une expérience mobile simple, avec un accès rapide aux principaux championnats. Les informations commerciales doivent être validées avant publication.",
      features: ['Application mobile', 'Paiements mobiles'],
      sports: ['Football', 'Basketball', 'Tennis'],
      depositMethods: ['Visa / Mastercard', 'E-wallets', 'Paiement mobile local'],
      withdrawalMethods: ['Virement', 'E-wallets'],
      minDeposit: '1 €',
      isFeatured: false,
      status: 'published',
      seoTitle: 'Linebet : avis, offre et code promo | CoupFranc',
      seoDescription: 'Revue complète de Linebet : découvrez les points forts et l’application mobile.',
      createdAt: '2026-01-15T11:00:00Z',
      updatedAt: '2026-03-08T16:00:00Z',
    },
    {
      id: 'bm_paripesa',
      name: 'Paripesa',
      slug: 'paripesa',
      initials: 'PP',
      tagline: 'Paris sportifs et promotions régulières',
      logo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=160&auto=format&fit=crop&q=80',
      rating: 4.5,
      bonusSummary: 'Bonus de bienvenue [à confirmer]',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      offerTerms: "18+. Offre soumise aux conditions du bookmaker. Vérification d'identité requise.",
      shortDescription: "Paripesa propose une plateforme complète avec de nombreuses options de paris d'avant-match et en direct.",
      fullDescription: "Paripesa propose une plateforme complète avec de nombreuses options de paris d'avant-match et en direct. Les promotions sont mises à jour régulièrement.",
      features: ['Paris en direct', 'Promotions'],
      sports: ['Football', 'Tennis', 'Basketball'],
      depositMethods: ['Cartes de crédit', 'Portefeuilles numériques'],
      withdrawalMethods: ['Transfert bancaire', 'E-wallets'],
      minDeposit: '2 €',
      isFeatured: false,
      status: 'published',
      seoTitle: 'Paripesa : avis, offre et code promo | CoupFranc',
      seoDescription: 'Analyse des offres Paripesa et fonctionnalités en direct.',
      createdAt: '2026-01-20T08:00:00Z',
      updatedAt: '2026-03-10T14:20:00Z',
    },
  ],
  offers: [
    {
      id: 'off_1xbet',
      bookmakerId: 'bm_1xbet',
      bookmakerName: '1xBet',
      title: 'Offre de bienvenue [à confirmer]',
      slug: 'bonus-1xbet',
      offerType: 'Bienvenue',
      bonusAmount: '130 €',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      terms: "18+ · Conditions de l'opérateur applicables",
      isFeatured: true,
      status: 'published',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-03-01T12:00:00Z',
    },
    {
      id: 'off_melbet',
      bookmakerId: 'bm_melbet',
      bookmakerName: 'Melbet',
      title: 'Bonus sur premier dépôt [à confirmer]',
      slug: 'bonus-melbet',
      offerType: 'Bienvenue',
      bonusAmount: '100 €',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      terms: "18+ · Conditions de l'opérateur applicables",
      isFeatured: true,
      status: 'published',
      createdAt: '2026-01-12T14:30:00Z',
      updatedAt: '2026-03-05T09:15:00Z',
    },
    {
      id: 'off_linebet',
      bookmakerId: 'bm_linebet',
      bookmakerName: 'Linebet',
      title: "Offre d'inscription [à confirmer]",
      slug: 'bonus-linebet',
      offerType: 'Bienvenue',
      bonusAmount: '30 €',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      terms: "18+ · Conditions de l'opérateur applicables",
      isFeatured: false,
      status: 'published',
      createdAt: '2026-01-15T11:00:00Z',
      updatedAt: '2026-03-08T16:00:00Z',
    },
    {
      id: 'off_paripesa',
      bookmakerId: 'bm_paripesa',
      bookmakerName: 'Paripesa',
      title: 'Bonus de bienvenue [à confirmer]',
      slug: 'bonus-paripesa',
      offerType: 'Bienvenue',
      bonusAmount: '100 €',
      promoCode: 'CODE-EXEMPLE',
      affiliateUrl: '#lien-affilie-a-configurer',
      ctaLabel: "Voir l'offre",
      terms: "18+ · Conditions de l'opérateur applicables",
      isFeatured: false,
      status: 'published',
      createdAt: '2026-01-20T08:00:00Z',
      updatedAt: '2026-03-10T14:20:00Z',
    },
  ],
  predictions: [
    {
      id: 'pred_equipe_a_b',
      title: 'Équipe A vs Équipe B',
      slug: 'equipe-a-vs-equipe-b',
      sport: 'Football',
      competition: "Championnat d'exemple",
      homeTeam: 'Équipe A',
      awayTeam: 'Équipe B',
      eventDate: '2026-10-18',
      eventTime: '21:00',
      predictionChoice: 'Les deux équipes marquent',
      odds: '[à confirmer]',
      confidence: 'Moyenne',
      confidencePercent: 70,
      recommendedBookmaker: '1xBet',
      editorialAnalysis: `L'Équipe A reste sur une série de matchs où elle a trouvé le chemin des filets, avec un pressing haut qui laisse toutefois des espaces derrière.

L'Équipe B, plus prudente à l'extérieur, s'appuie sur des transitions rapides. Ses ailiers pourraient profiter des montées des latéraux adverses.

Notre lecture : un match ouvert où chaque équipe a les moyens de marquer. Cette analyse est un avis éditorial, pas une garantie de résultat.`,
      isFeatured: true,
      status: 'published',
      createdAt: '2026-10-14T08:00:00Z',
      updatedAt: '2026-10-14T08:00:00Z',
    },
    {
      id: 'pred_club_c_d',
      title: 'Club C vs Club D',
      slug: 'club-c-vs-club-d',
      sport: 'Football',
      competition: "Coupe d'exemple",
      homeTeam: 'Club C',
      awayTeam: 'Club D',
      eventDate: '2026-10-19',
      eventTime: '18:00',
      predictionChoice: 'Victoire ou nul Club C',
      odds: '[à confirmer]',
      confidence: 'Élevée',
      confidencePercent: 85,
      recommendedBookmaker: 'Melbet',
      editorialAnalysis: `Le Club C a rarement été mis en difficulté devant son public cette saison et récupère ses cadres.

Le Club D fait tourner son effectif en coupe, ce qui pourrait peser sur l'intensité de son milieu.

Avis éditorial uniquement : les performances passées ne préjugent pas des résultats futurs.`,
      isFeatured: true,
      status: 'published',
      createdAt: '2026-10-13T10:00:00Z',
      updatedAt: '2026-10-13T10:00:00Z',
    },
    {
      id: 'pred_joueur_e_f',
      title: 'Joueur E vs Joueur F',
      slug: 'joueur-e-vs-joueur-f',
      sport: 'Tennis',
      competition: "Tournoi ATP d'exemple",
      homeTeam: 'Joueur E',
      awayTeam: 'Joueur F',
      eventDate: '2026-10-20',
      eventTime: '14:30',
      predictionChoice: 'Plus de 21,5 jeux',
      odds: '[à confirmer]',
      confidence: 'Moyenne',
      confidencePercent: 68,
      recommendedBookmaker: 'Linebet',
      editorialAnalysis: `Deux gros serveurs sur surface rapide : les breaks risquent d'être rares.

Le Joueur E affiche un pourcentage élevé de points gagnés derrière sa première balle, tandis que le Joueur F excelle dans les jeux décisifs.

Analyse éditoriale indépendante. Aucun gain garanti.`,
      isFeatured: false,
      status: 'published',
      createdAt: '2026-10-12T14:00:00Z',
      updatedAt: '2026-10-12T14:00:00Z',
    },
  ],
  articles: [
    {
      id: 'art_comprendre_cotes',
      title: 'Comprendre les cotes et les probabilités',
      slug: 'comprendre-les-cotes',
      excerpt: "Cote décimale, probabilité implicite, marge de l'opérateur : les bases expliquées simplement.",
      content: `<p>Une cote exprime à la fois un gain potentiel et une estimation de probabilité. Savoir la lire est la première étape pour parier de façon réfléchie.</p>
<h2>La cote décimale</h2>
<p>En France et en Europe, la cote décimale est la plus répandue : votre gain potentiel correspond à la mise multipliée par la cote.</p>
<h2>La probabilité implicite</h2>
<p>En divisant 1 par la cote, on obtient la probabilité implicite estimée par l'opérateur. La somme de ces probabilités dépasse souvent 100 % : c'est la marge.</p>
<h2>À retenir</h2>
<p>Une cote n'est jamais une garantie. Elle reflète une estimation, et le hasard reste au cœur du sport.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Graphiques de paris et calculs de cotes',
      category: 'Guides',
      author: 'La Rédaction CoupFranc',
      readingTime: '6 min',
      isFeatured: true,
      status: 'published',
      publishedAt: '2026-10-12T09:00:00Z',
      createdAt: '2026-10-12T09:00:00Z',
      updatedAt: '2026-10-12T09:00:00Z',
    },
    {
      id: 'art_gerer_bankroll',
      title: 'Fixer un budget de jeu et s’y tenir',
      slug: 'gerer-sa-bankroll',
      excerpt: 'Définir des limites claires avant de parier est essentiel pour garder le contrôle.',
      content: `<p>Le pari sportif doit rester un divertissement. Fixer un budget avant de jouer permet d'éviter les décisions impulsives.</p>
<h2>Définir un montant</h2>
<p>Choisissez une somme que vous pouvez perdre sans impact sur votre quotidien, et ne la dépassez pas.</p>
<h2>Utiliser les outils</h2>
<p>La plupart des opérateurs proposent des limites de dépôt et des périodes d'auto-exclusion. N'hésitez pas à les activer.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Terrain de football sous les projecteurs',
      category: 'Jeu responsable',
      author: 'La Rédaction CoupFranc',
      readingTime: '4 min',
      isFeatured: true,
      status: 'published',
      publishedAt: '2026-10-09T14:30:00Z',
      createdAt: '2026-10-09T14:30:00Z',
      updatedAt: '2026-10-09T14:30:00Z',
    },
    {
      id: 'art_tendances_tactiques',
      title: 'Les tendances tactiques qui marquent la saison',
      slug: 'tendances-tactiques-saison',
      excerpt: 'Pressing coordonné, latéraux intérieurs, blocs compacts : tour d’horizon des évolutions du jeu.',
      content: `<p>Le football moderne évolue à grande vitesse. Comprendre les schémas tactiques dominants permet d'affiner son regard sur les matchs.</p>
<h2>Le pressing tout-terrain</h2>
<p>De plus en plus d'équipes déclenchent un pressing agressif dès la perte du ballon pour forcer l'adversaire à allonger.</p>
<h2>L'importance des transitions</h2>
<p>Les secondes qui suivent la récupération sont devenues capitales dans la construction des occasions nettes.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      imageAlt: 'Joueur de football en action de tir',
      category: 'Analyses',
      author: 'La Rédaction CoupFranc',
      readingTime: '5 min',
      isFeatured: false,
      status: 'published',
      publishedAt: '2026-10-05T11:00:00Z',
      createdAt: '2026-10-05T11:00:00Z',
      updatedAt: '2026-10-05T11:00:00Z',
    },
  ],
  pages: {
    'a-propos': {
      slug: 'a-propos',
      title: 'À propos de CoupFranc',
      metaDescription: 'Découvrez la ligne éditoriale et les engagements de CoupFranc.',
      content: `<h2>Notre Mission</h2>
<p>CoupFranc est un média indépendant en langue française dédié aux passionnés de sport et de paris sportifs. Notre objectif est d'offrir des informations claires, des comparatifs transparents et des analyses rédigées avec rigueur.</p>
<h2>Transparence et modèle économique</h2>
<p>Notre site est gratuit d'accès. Nous participons à des programmes d'affiliation avec des opérateurs agréés ou partenaires, ce qui signifie que nous pouvons percevoir une commission lorsque vous vous inscrivez via nos liens. Cela n'influe en rien sur notre ligne éditoriale.</p>
<h2>Engagements</h2>
<p>Nous ne promettons jamais de gains miraculeux ni de méthodes infaillibles. Le sport reste imprévisible et les paris comportent toujours un risque financier.</p>`,
      updatedAt: '2026-10-14T07:00:00Z',
    },
    'mentions-legales': {
      slug: 'mentions-legales',
      title: 'Mentions Légales',
      metaDescription: 'Mentions légales du site CoupFranc.',
      content: `<h2>Éditeur du site</h2>
<p>Le site CoupFranc est un projet éditorial indépendant d'information sur les paris sportifs.</p>
<p>Contact : contact@coupfranc.fr</p>
<h2>Hébergement</h2>
<p>Le site est hébergé sur une infrastructure de serveur virtuel privé (Linux VPS) avec conteneurs Docker sécurisés.</p>
<h2>Avertissement</h2>
<p>CoupFranc n'est pas un opérateur de jeux d'argent. Nous ne collectons aucun pari et ne gérons aucun compte joueur.</p>`,
      updatedAt: '2026-10-14T07:00:00Z',
    },
    'politique-de-confidentialite': {
      slug: 'politique-de-confidentialite',
      title: 'Politique de Confidentialité',
      metaDescription: 'Comment CoupFranc collecte et protège vos données personnelles.',
      content: `<h2>Protection des données (RGPD)</h2>
<p>CoupFranc respecte votre vie privée et limite la collecte de données au strict nécessaire pour le fonctionnement du site.</p>
<h2>Données collectées</h2>
<p>Nous ne demandons aucune inscription aux visiteurs réguliers. Les seules données transmises sont celles que vous renseignez volontairement via le formulaire de contact.</p>`,
      updatedAt: '2026-10-14T07:00:00Z',
    },
    'gestion-des-cookies': {
      slug: 'gestion-des-cookies',
      title: 'Gestion des Cookies',
      metaDescription: 'Informations sur les cookies utilisés par CoupFranc et comment les gérer.',
      content: `<h2>Utilisation des cookies</h2>
<p>Ce site utilise des cookies techniques nécessaires au bon fonctionnement de la navigation et à la mémorisation de vos préférences.</p>
<h2>Liens d'affiliation</h2>
<p>Les liens vers nos opérateurs partenaires peuvent déposer un traceur anonyme pour attribuer l'inscription à CoupFranc.</p>`,
      updatedAt: '2026-10-14T07:00:00Z',
    },
    'jeu-responsable': {
      slug: 'jeu-responsable',
      title: 'Jeu Responsable',
      metaDescription: 'Prévention et accompagnement sur les risques liés aux jeux d’argent.',
      content: `<h2>Jouer doit rester un plaisir</h2>
<p>Les paris sportifs doivent être abordés comme un divertissement et non comme un moyen de gagner sa vie ou de rembourser des dettes.</p>
<h2>Conseils essentiels</h2>
<ul>
  <li>Ne pariez que des sommes dont vous pouvez vous passer.</li>
  <li>Ne cherchez jamais à vous refaire immédiatement après une perte.</li>
  <li>Fixez-vous des limites de temps et d'argent avant chaque session.</li>
</ul>
<h2>Besoin d'aide ?</h2>
<p>Si vous ressentez une perte de contrôle, contactez Joueurs Info Service au <strong>09 74 75 13 13</strong> (appel non surtaxé).</p>`,
      updatedAt: '2026-10-14T07:00:00Z',
    },
    'contact': {
      slug: 'contact',
      title: 'Contact',
      metaDescription: 'Contactez la rédaction de CoupFranc.',
      content: `<h2>Contactez la rédaction</h2>
<p>Pour toute question générale, proposition de partenariat ou signalement d'une information à actualiser :</p>
<p>E-mail : <strong>contact@coupfranc.fr</strong></p>`,
      updatedAt: '2026-10-14T07:00:00Z',
    },
  },
};

export class DatabaseService {
  private data: AppDatabase;
  private dbFile: string;

  constructor(customDbPath?: string) {
    this.dbFile = customDbPath || getDbFilePath();
    const dataDir = path.dirname(this.dbFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const uploadsDir = getUploadsDir();
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    this.data = this.loadDatabase();
    validateProductionCredentials(this.data.users);
  }

  public reloadFromDisk(customPath?: string): void {
    if (customPath) {
      this.dbFile = customPath;
    } else {
      this.dbFile = getDbFilePath();
    }
    this.data = this.loadDatabase();
  }

  private loadDatabase(): AppDatabase {
    try {
      if (fs.existsSync(this.dbFile)) {
        const fileContent = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(fileContent);
        let users: AdminUserData[] = parsed.users || [];

        const adminIndex = users.findIndex(
          (u: any) => u.email === 'admin' || u.email === 'admin@coupfranc.fr'
        );

        if (adminIndex >= 0) {
          let passHash = users[adminIndex].passwordHash;
          const initialAdminPass = process.env.ADMIN_INITIAL_PASSWORD;
          if (initialAdminPass && initialAdminPass.trim().length >= 10) {
            let isWeak = !passHash;
            if (passHash) {
              for (const weak of KNOWN_WEAK_PASSWORDS) {
                if (bcrypt.compareSync(weak, passHash)) {
                  isWeak = true;
                  break;
                }
              }
            }
            if (isWeak) {
              passHash = bcrypt.hashSync(initialAdminPass.trim(), 10);
            }
          }

          // Normalize email to 'admin' while preserving existing or initialized passwordHash
          users[adminIndex] = {
            ...users[adminIndex],
            email: 'admin',
            name: users[adminIndex].name || 'Администратор',
            passwordHash: passHash,
            role: 'admin',
          };
        } else {
          // No administrator exists in existing DB, initialize default admin
          users.unshift({
            id: 'usr_admin_1',
            email: 'admin',
            name: 'Администратор',
            passwordHash: getInitialAdminHash(),
            role: 'admin',
            createdAt: '2026-01-01T00:00:00Z',
          });
        }

        const loaded: AppDatabase = {
          ...INITIAL_DATABASE,
          ...parsed,
          users,
          pages: { ...INITIAL_DATABASE.pages, ...(parsed.pages || {}) },
        };
        this.saveDatabase(loaded);
        return loaded;
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('[FATAL CONFIG ERROR]')) {
        throw err;
      }
      console.error('Failed to load database file:', err);
    }

    const initialDb: AppDatabase = {
      ...INITIAL_DATABASE,
      users: [
        {
          ...INITIAL_DATABASE.users[0],
          passwordHash: getInitialAdminHash(),
        },
      ],
    };
    this.saveDatabase(initialDb);
    return initialDb;
  }

  private saveDatabase(dataToSave: AppDatabase): void {
    try {
      const tempFile = `${this.dbFile}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempFile, this.dbFile);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  getStats() {
    const publishedArticles = this.data.articles.filter((a) => a.status === 'published').length;
    const draftArticles = this.data.articles.filter((a) => a.status === 'draft').length;
    const publishedBookmakers = this.data.bookmakers.filter((b) => b.status === 'published').length;
    const publishedOffers = this.data.offers.filter((o) => o.status === 'published').length;
    const publishedPredictions = this.data.predictions.filter((p) => p.status === 'published').length;
    const activePromoCodes = this.data.offers.filter((o) => o.promoCode && o.status === 'published').length;

    return {
      publishedArticlesCount: publishedArticles,
      draftArticlesCount: draftArticles,
      bookmakersCount: publishedBookmakers,
      offersCount: publishedOffers,
      predictionsCount: publishedPredictions,
      activePromoCodesCount: activePromoCodes,
    };
  }

  findUserByEmail(email: string): AdminUserData | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => {
      const uEmail = u.email.toLowerCase();
      return (
        uEmail === normalized ||
        (normalized === 'admin' && uEmail.includes('admin')) ||
        (normalized === 'admin@coupfranc.fr' && uEmail === 'admin')
      );
    });
  }

  findUserById(id: string): AdminUserData | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  updateUserPassword(id: string, newPasswordHash: string): boolean {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return false;
    user.passwordHash = newPasswordHash;
    this.saveDatabase(this.data);
    return true;
  }

  getBookmakers(publishedOnly = true): Bookmaker[] {
    const list = publishedOnly
      ? this.data.bookmakers.filter((b) => b.status === 'published')
      : this.data.bookmakers;
    return [...list].sort((a, b) => b.rating - a.rating);
  }

  getBookmakerBySlug(slug: string): Bookmaker | undefined {
    return this.data.bookmakers.find((b) => b.slug === slug);
  }

  saveBookmaker(item: Bookmaker): Bookmaker {
    const now = new Date().toISOString();
    const index = this.data.bookmakers.findIndex((b) => b.id === item.id);
    if (index >= 0) {
      this.data.bookmakers[index] = { ...item, updatedAt: now };
    } else {
      this.data.bookmakers.push({
        ...item,
        createdAt: item.createdAt || now,
        updatedAt: now,
      });
    }
    this.saveDatabase(this.data);
    return index >= 0 ? this.data.bookmakers[index] : item;
  }

  deleteBookmaker(id: string): boolean {
    const initialLen = this.data.bookmakers.length;
    this.data.bookmakers = this.data.bookmakers.filter((b) => b.id !== id);
    if (this.data.bookmakers.length !== initialLen) {
      this.saveDatabase(this.data);
      return true;
    }
    return false;
  }

  getOffers(publishedOnly = true): PromotionalOffer[] {
    const list = publishedOnly
      ? this.data.offers.filter((o) => o.status === 'published')
      : this.data.offers;
    return [...list].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }

  getOfferById(id: string): PromotionalOffer | undefined {
    return this.data.offers.find((o) => o.id === id);
  }

  saveOffer(item: PromotionalOffer): PromotionalOffer {
    const now = new Date().toISOString();
    const index = this.data.offers.findIndex((o) => o.id === item.id);
    if (index >= 0) {
      this.data.offers[index] = { ...item, updatedAt: now };
    } else {
      this.data.offers.push({
        ...item,
        createdAt: item.createdAt || now,
        updatedAt: now,
      });
    }
    this.saveDatabase(this.data);
    return index >= 0 ? this.data.offers[index] : item;
  }

  deleteOffer(id: string): boolean {
    const initialLen = this.data.offers.length;
    this.data.offers = this.data.offers.filter((o) => o.id !== id);
    if (this.data.offers.length !== initialLen) {
      this.saveDatabase(this.data);
      return true;
    }
    return false;
  }

  getPredictions(publishedOnly = true): SportsPrediction[] {
    const list = publishedOnly
      ? this.data.predictions.filter((p) => p.status === 'published')
      : this.data.predictions;
    return [...list].sort(
      (a, b) => new Date(`${b.eventDate}T${b.eventTime || '00:00'}`).getTime() - new Date(`${a.eventDate}T${a.eventTime || '00:00'}`).getTime()
    );
  }

  getPredictionBySlug(slug: string): SportsPrediction | undefined {
    return this.data.predictions.find((p) => p.slug === slug);
  }

  savePrediction(item: SportsPrediction): SportsPrediction {
    const now = new Date().toISOString();
    const index = this.data.predictions.findIndex((p) => p.id === item.id);
    if (index >= 0) {
      this.data.predictions[index] = { ...item, updatedAt: now };
    } else {
      this.data.predictions.push({
        ...item,
        createdAt: item.createdAt || now,
        updatedAt: now,
      });
    }
    this.saveDatabase(this.data);
    return index >= 0 ? this.data.predictions[index] : item;
  }

  deletePrediction(id: string): boolean {
    const initialLen = this.data.predictions.length;
    this.data.predictions = this.data.predictions.filter((p) => p.id !== id);
    if (this.data.predictions.length !== initialLen) {
      this.saveDatabase(this.data);
      return true;
    }
    return false;
  }

  getArticles(publishedOnly = true): Article[] {
    const list = publishedOnly
      ? this.data.articles.filter((a) => a.status === 'published')
      : this.data.articles;
    return [...list].sort(
      (a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
    );
  }

  getArticleBySlug(slug: string): Article | undefined {
    return this.data.articles.find((a) => a.slug === slug);
  }

  saveArticle(item: Article): Article {
    const now = new Date().toISOString();
    const index = this.data.articles.findIndex((a) => a.id === item.id);
    if (index >= 0) {
      this.data.articles[index] = { ...item, updatedAt: now };
    } else {
      this.data.articles.push({
        ...item,
        createdAt: item.createdAt || now,
        updatedAt: now,
      });
    }
    this.saveDatabase(this.data);
    return index >= 0 ? this.data.articles[index] : item;
  }

  deleteArticle(id: string): boolean {
    const initialLen = this.data.articles.length;
    this.data.articles = this.data.articles.filter((a) => a.id !== id);
    if (this.data.articles.length !== initialLen) {
      this.saveDatabase(this.data);
      return true;
    }
    return false;
  }

  getCategories(): string[] {
    return this.data.categories;
  }

  addCategory(category: string): string[] {
    if (!this.data.categories.includes(category)) {
      this.data.categories.push(category);
      this.saveDatabase(this.data);
    }
    return this.data.categories;
  }

  getPage(slug: string): InformationalPage | undefined {
    return this.data.pages[slug];
  }

  savePage(page: InformationalPage): InformationalPage {
    const now = new Date().toISOString();
    this.data.pages[page.slug] = {
      ...page,
      updatedAt: now,
    };
    this.saveDatabase(this.data);
    return this.data.pages[page.slug];
  }

  getAllPages(): InformationalPage[] {
    return Object.values(this.data.pages);
  }
}

export const db = new DatabaseService();

export function createDatabaseService(customDbPath?: string): DatabaseService {
  return new DatabaseService(customDbPath);
}

