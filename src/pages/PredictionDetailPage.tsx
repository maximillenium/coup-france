import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { SportsPrediction, Bookmaker } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';
import { BookmakerCard } from '../components/BookmakerCard.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

interface Props {
  slug: string;
}

export function PredictionDetailPage({ slug }: Props) {
  const [prediction, setPrediction] = useState<SportsPrediction | null>(null);
  const [suggestedBookmaker, setSuggestedBookmaker] = useState<Bookmaker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const pred = await api.getPredictionBySlug(slug);
        setPrediction(pred);

        const bms = await api.getBookmakers();
        if (bms.length > 0) {
          const match = bms.find((b) => b.name.toLowerCase() === pred.recommendedBookmaker?.toLowerCase());
          setSuggestedBookmaker(match || bms[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="container-site py-20 text-center">
        <p className="text-muted-foreground">Chargement du pronostic...</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="text-4xl font-bold font-display uppercase">Pronostic introuvable</h1>
        <Link href="/pronostics" className="mt-4 inline-block underline decoration-accent hover:text-accent">
          ← Tous les pronostics
        </Link>
      </div>
    );
  }

  const conf =
    prediction.confidence ||
    (prediction.confidencePercent >= 80 ? 'Élevée' : prediction.confidencePercent >= 60 ? 'Moyenne' : 'Faible');

  return (
    <>
      <SEOHead
        title={`Pronostic ${prediction.homeTeam} – ${prediction.awayTeam} | CoupFranc`}
        description={prediction.title}
        canonicalPath={`/pronostics/${prediction.slug}`}
      />

      {/* Header Banner */}
      <section className="bg-gradient-ink text-ink-foreground">
        <div className="container-site py-14 text-center">
          <Link href="/pronostics" className="text-sm text-ink-foreground/60 hover:text-accent transition-colors">
            ← Pronostics
          </Link>
          <p className="kicker mt-4 text-accent">
            {prediction.sport} · {prediction.competition} · {prediction.eventDate}
          </p>
          <h1 className="mt-3 text-5xl font-extrabold uppercase md:text-7xl font-display">
            {prediction.homeTeam} <span className="text-accent">vs</span> {prediction.awayTeam}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-ink-foreground/75 leading-relaxed font-sans">
            {prediction.title}
          </p>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container-site mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Left Column: Analysis */}
        <article className="prose-site">
          <h2>Analyse</h2>
          <div className="whitespace-pre-line leading-relaxed space-y-4 text-foreground/90">
            {prediction.editorialAnalysis}
          </div>

          <div className="mt-6 rounded-xl border-l-4 border-accent bg-card p-5 shadow-card">
            <p className="kicker text-muted-foreground">Notre avis</p>
            <p className="font-display text-2xl font-bold uppercase text-foreground">
              {prediction.predictionChoice}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Confiance : {conf} · Cote : {prediction.odds || '[à confirmer]'}
            </p>
          </div>
        </article>

        {/* Right Sidebar: Suggested Bookmaker */}
        <aside className="space-y-4">
          <p className="kicker text-muted-foreground">Bookmaker suggéré</p>
          {suggestedBookmaker && <BookmakerCard bookmaker={suggestedBookmaker} />}
        </aside>
      </div>

      <ResponsibleGamblingSection />
    </>
  );
}
