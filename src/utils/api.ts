import {
  Bookmaker,
  PromotionalOffer,
  SportsPrediction,
  Article,
  InformationalPage,
  DashboardStats,
  AdminUser,
} from '../types/index.ts';

const API_BASE = '';

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('coupfranc_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeader(),
    ...(init.headers || {}),
  };
  return fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
}

export const api = {
  // --- Public APIs ---
  async getBookmakers(all = false): Promise<Bookmaker[]> {
    const res = await apiFetch(`${API_BASE}/api/bookmakers${all ? '?all=true' : ''}`);
    if (!res.ok) throw new Error('Erreur lors du chargement des bookmakers');
    return res.json();
  },

  async getBookmakerBySlug(slug: string): Promise<Bookmaker> {
    const res = await apiFetch(`${API_BASE}/api/bookmakers/${slug}`);
    if (!res.ok) throw new Error('Bookmaker introuvable');
    return res.json();
  },

  async getOffers(all = false): Promise<PromotionalOffer[]> {
    const res = await apiFetch(`${API_BASE}/api/offers${all ? '?all=true' : ''}`);
    if (!res.ok) throw new Error('Erreur lors du chargement des bonus');
    return res.json();
  },

  async getPredictions(all = false): Promise<SportsPrediction[]> {
    const res = await apiFetch(`${API_BASE}/api/predictions${all ? '?all=true' : ''}`);
    if (!res.ok) throw new Error('Erreur lors du chargement des pronostics');
    return res.json();
  },

  async getPredictionBySlug(slug: string): Promise<SportsPrediction> {
    const res = await apiFetch(`${API_BASE}/api/predictions/${slug}`);
    if (!res.ok) throw new Error('Pronostic introuvable');
    return res.json();
  },

  async getArticles(category?: string, all = false): Promise<Article[]> {
    let url = `${API_BASE}/api/articles?all=${all}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error('Erreur lors du chargement des articles');
    return res.json();
  },

  async getArticleBySlug(slug: string): Promise<Article> {
    const res = await apiFetch(`${API_BASE}/api/articles/${slug}`);
    if (!res.ok) throw new Error('Article introuvable');
    return res.json();
  },

  async getCategories(): Promise<string[]> {
    const res = await apiFetch(`${API_BASE}/api/categories`);
    if (!res.ok) throw new Error('Erreur lors du chargement des catégories');
    return res.json();
  },

  async getPage(slug: string): Promise<InformationalPage> {
    const res = await apiFetch(`${API_BASE}/api/pages/${slug}`);
    if (!res.ok) throw new Error('Page introuvable');
    return res.json();
  },

  // --- Auth APIs ---
  async login(email: string, password: string): Promise<{ user: AdminUser }> {
    const res = await apiFetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Identifiants invalides');
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch {
      // ignore
    }
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const res = await apiFetch(`${API_BASE}/api/auth/me`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiFetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de mot de passe');
    return data;
  },

  // --- Admin CRUD APIs ---
  async getAdminStats(): Promise<DashboardStats> {
    const res = await apiFetch(`${API_BASE}/api/admin/stats`);
    if (!res.ok) throw new Error('Erreur chargement statistiques');
    return res.json();
  },

  async saveBookmaker(item: Partial<Bookmaker>): Promise<Bookmaker> {
    const isEdit = !!item.id;
    const url = isEdit ? `${API_BASE}/api/bookmakers/${item.id}` : `${API_BASE}/api/bookmakers`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur enregistrement bookmaker');
    return data;
  },

  async deleteBookmaker(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/bookmakers/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erreur suppression bookmaker');
  },

  async saveOffer(item: Partial<PromotionalOffer>): Promise<PromotionalOffer> {
    const isEdit = !!item.id;
    const url = isEdit ? `${API_BASE}/api/offers/${item.id}` : `${API_BASE}/api/offers`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur enregistrement bonus');
    return data;
  },

  async deleteOffer(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/offers/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erreur suppression bonus');
  },

  async savePrediction(item: Partial<SportsPrediction>): Promise<SportsPrediction> {
    const isEdit = !!item.id;
    const url = isEdit ? `${API_BASE}/api/predictions/${item.id}` : `${API_BASE}/api/predictions`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur enregistrement pronostic');
    return data;
  },

  async deletePrediction(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/predictions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erreur suppression pronostic');
  },

  async saveArticle(item: Partial<Article>): Promise<Article> {
    const isEdit = !!item.id;
    const url = isEdit ? `${API_BASE}/api/articles/${item.id}` : `${API_BASE}/api/articles`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur enregistrement article');
    return data;
  },

  async deleteArticle(id: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/api/articles/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erreur suppression article');
  },

  async getAllPages(): Promise<InformationalPage[]> {
    const res = await apiFetch(`${API_BASE}/api/pages`);
    if (!res.ok) throw new Error('Erreur chargement pages');
    return res.json();
  },

  async savePage(page: InformationalPage): Promise<InformationalPage> {
    const res = await apiFetch(`${API_BASE}/api/pages/${page.slug}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(page),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur enregistrement page');
    return data;
  },

  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiFetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors du téléversement');
    return data;
  },
};
