export type PublicationStatus = 'published' | 'draft';

export interface Bookmaker {
  id: string;
  name: string;
  slug: string;
  initials?: string; // e.g. "1X", "MB", "LB", "PP"
  tagline?: string;
  logo: string;
  rating: number; // e.g. 4.8 / 5
  bonusSummary: string; // e.g. "Jusqu'à 130€ de bonus à l'inscription"
  promoCode: string; // e.g. "COUPFRANC"
  affiliateUrl: string; // Verified affiliate or demo link
  ctaLabel: string; // "Profiter de l'offre"
  offerTerms: string; // T&Cs
  shortDescription: string;
  fullDescription: string;
  features: string[];
  sports?: string[];
  depositMethods: string[];
  withdrawalMethods: string[];
  minDeposit: string;
  isFeatured: boolean;
  status: PublicationStatus;
  expirationDate?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionalOffer {
  id: string;
  bookmakerId: string;
  bookmakerName: string;
  title: string;
  slug: string;
  offerType: 'Bienvenue' | 'Freebet' | 'Dépôt' | 'Cashback' | 'Combiné';
  bonusAmount: string; // e.g. "130€"
  promoCode: string;
  affiliateUrl: string;
  ctaLabel: string;
  terms: string;
  expirationDate?: string;
  isFeatured: boolean;
  status: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SportsPrediction {
  id: string;
  title: string;
  slug: string;
  sport: 'Football' | 'Basketball' | 'Tennis' | 'Rugby';
  competition: string; // e.g. "Ligue 1", "Ligue des Champions", "Premier League"
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  eventDate: string; // ISO string
  eventTime: string; // e.g. "21:00"
  predictionChoice: string; // e.g. "Victoire Paris SG & +2.5 buts"
  odds: string; // e.g. "1.92"
  confidence?: 'Faible' | 'Moyenne' | 'Élevée';
  confidencePercent: number; // e.g. 75
  recommendedBookmaker: string;
  editorialAnalysis: string; // In-depth tactical & squad preview
  statistics?: {
    stat: string;
    source: string;
  }[];
  isFeatured: boolean;
  status: PublicationStatus;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Rich text / formatted HTML
  featuredImage: string;
  imageAlt: string;
  category: string; // e.g. "Guide & Stratégie", "Ligue 1", "Pronostics", "Actualités"
  author: string;
  readingTime: string; // e.g. "4 min"
  isFeatured: boolean;
  status: PublicationStatus;
  publishedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InformationalPage {
  slug: string;
  title: string;
  metaDescription: string;
  content: string; // HTML or Markdown formatted
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  createdAt: string;
}

export interface DashboardStats {
  publishedArticlesCount: number;
  draftArticlesCount: number;
  bookmakersCount: number;
  offersCount: number;
  predictionsCount: number;
  activePromoCodesCount: number;
}
