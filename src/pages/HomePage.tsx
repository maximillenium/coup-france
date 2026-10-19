import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { Bookmaker, SportsPrediction, Article } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';
import { BookmakerCard } from '../components/BookmakerCard.tsx';
import { PredictionCard } from '../components/PredictionCard.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { SectionHeader } from '../components/SectionHeader.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

export function HomePage() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [predictions, setPredictions] = useState<SportsPrediction[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [bms, preds, arts] = await Promise.all([
          api.getBookmakers(),
          api.getPredictions(),
          api.getArticles(),
        ]);
        setBookmakers(bms);
        setPredictions(preds);
        setArticles(arts);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <>
      <SEOHead
        title="Paris sportifs, bonus et pronostics | CoupFranc"
        description="Comparez les bookmakers, découvrez les offres de bienvenue et lisez nos pronostics et analyses sportives en français."
        canonicalPath="/"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img
          src="https://pixel-pal-02.lovable.app/assets/hero-stadium-ulLb8RNr.jpg"
          alt="Stade de football illuminé de nuit"
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container-site relative py-24 md:py-32">
          <p className="kicker text-accent">Le média des parieurs avertis</p>
          <h1 className="mt-3 max-w-3xl text-6xl font-extrabold uppercase leading-[0.95] md:text-8xl font-display">
            Analyser. Comparer. <span className="text-accent">Parier lucide.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-foreground/80 leading-relaxed font-sans">
            Présentations d'opérateurs, offres de bienvenue et pronostics éditoriaux pour suivre le sport autrement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/bookmakers"
              className="rounded-md bg-accent px-6 py-3 font-bold text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Comparer les bookmakers
            </Link>
            <Link
              href="/pronostics"
              className="rounded-md border-2 border-ink-foreground/40 px-6 py-3 font-bold hover:border-accent hover:text-accent text-ink-foreground transition-colors"
            >
              Voir les pronostics
            </Link>
          </div>
        </div>
      </section>

      {/* Section 1: Offres bookmakers */}
      <section className="container-site mt-16">
        <SectionHeader
          kicker="Sélection"
          title="Offres bookmakers"
          to="/bookmakers"
          linkLabel="Tous les bookmakers"
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bookmakers.map((b) => (
              <BookmakerCard key={b.slug} bookmaker={b} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Derniers pronostics */}
      <section className="container-site mt-16">
        <SectionHeader
          kicker="À la une"
          title="Derniers pronostics"
          to="/pronostics"
          linkLabel="Tous les pronostics"
        />
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {predictions.slice(0, 3).map((p) => (
              <PredictionCard key={p.slug} prediction={p} />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Dernières actualités */}
      <section className="container-site mt-16">
        <SectionHeader
          kicker="Rédaction"
          title="Dernières actualités"
          to="/actualites"
          linkLabel="Toutes les actualités"
        />
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </section>

      {/* Responsible gambling block */}
      <ResponsibleGamblingSection />
    </>
  );
}
