import { useEffect, useState } from 'react';
import { RouterProvider, useRouter } from './utils/navigation.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ResponsibleGamblingBanner } from './components/ResponsibleGamblingBanner.tsx';

// Public Pages
import { HomePage } from './pages/HomePage.tsx';
import { BookmakersPage } from './pages/BookmakersPage.tsx';
import { BookmakerDetailPage } from './pages/BookmakerDetailPage.tsx';
import { BonusesPage } from './pages/BonusesPage.tsx';
import { PredictionsPage } from './pages/PredictionsPage.tsx';
import { PredictionDetailPage } from './pages/PredictionDetailPage.tsx';
import { ArticlesPage } from './pages/ArticlesPage.tsx';
import { ArticleDetailPage } from './pages/ArticleDetailPage.tsx';
import { InformationalPageViewer } from './pages/InformationalPageViewer.tsx';

// Admin Pages
import { AdminLogin } from './admin/AdminLogin.tsx';
import { AdminLayout } from './admin/AdminLayout.tsx';
import { AdminUser } from './types/index.ts';
import { api } from './utils/api.ts';
import { Link } from './utils/navigation.tsx';
import { ArrowLeft } from 'lucide-react';

function AppContent() {
  const { path } = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, [path]);

  // Handle Admin Route
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (!currentUser) {
      return <AdminLogin onSuccess={(user) => setCurrentUser(user)} />;
    }

    return (
      <AdminLayout
        user={currentUser}
        onLogout={async () => {
          await api.logout();
          setCurrentUser(null);
        }}
      />
    );
  }

  // Handle Public Routes
  const renderPublicPage = () => {
    // 1. Homepage
    if (path === '/' || path === '') {
      return <HomePage />;
    }

    // 2. Bookmakers directory & details
    if (path === '/bookmakers') {
      return <BookmakersPage />;
    }
    if (path.startsWith('/bookmakers/')) {
      const slug = path.replace('/bookmakers/', '').replace(/\/$/, '');
      return <BookmakerDetailPage slug={slug} />;
    }

    // 3. Bonus directory
    if (path === '/bonus') {
      return <BonusesPage />;
    }

    // 4. Predictions directory & details
    if (path === '/pronostics') {
      return <PredictionsPage />;
    }
    if (path.startsWith('/pronostics/')) {
      const slug = path.replace('/pronostics/', '').replace(/\/$/, '');
      return <PredictionDetailPage slug={slug} />;
    }

    // 5. Articles directory & details
    if (path === '/actualites') {
      return <ArticlesPage />;
    }
    if (path.startsWith('/actualites/')) {
      const slug = path.replace('/actualites/', '').replace(/\/$/, '');
      return <ArticleDetailPage slug={slug} />;
    }

    // 6. Legal & Informational Pages
    const legalPages = [
      'a-propos',
      'contact',
      'mentions-legales',
      'politique-de-confidentialite',
      'gestion-des-cookies',
      'jeu-responsable',
    ];
    const cleanSlug = path.replace(/^\//, '').replace(/\/$/, '');
    if (legalPages.includes(cleanSlug)) {
      return <InformationalPageViewer slug={cleanSlug} />;
    }

    // 7. Custom 404 Page
    return (
      <div className="container-site py-28 text-center space-y-4">
        <h1 className="font-display font-black text-7xl text-primary">404</h1>
        <h2 className="font-display font-bold text-2xl text-foreground uppercase">Page non trouvée</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Le lien que vous avez suivi est incorrect ou la page a été déplacée.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-accent text-accent-foreground font-bold text-sm uppercase tracking-wider transition-opacity hover:opacity-90 shadow-sm font-display"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner à l'accueil</span>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{renderPublicPage()}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
