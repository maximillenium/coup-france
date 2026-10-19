import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { SportsPrediction } from '../types/index.ts';
import { PredictionCard } from '../components/PredictionCard.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { FilterPills } from '../components/FilterPills.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

export function PredictionsPage() {
  const [predictions, setPredictions] = useState<SportsPrediction[]>([]);
  const [filter, setFilter] = useState('Tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPredictions();
        setPredictions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sports = ['Tous', 'Football', 'Tennis', 'Basketball'];

  const filtered =
    filter === 'Tous'
      ? predictions
      : predictions.filter((p) => p.sport.toLowerCase() === filter.toLowerCase());

  return (
    <>
      <SEOHead
        title="Pronostics et analyses sportives | CoupFranc"
        description="Nos lectures de matchs, rédigées par la rédaction. Un pronostic reste un avis : aucun résultat n'est garanti."
        canonicalPath="/pronostics"
      />

      <PageHeader
        kicker="Analyses"
        title="Pronostics"
        intro="Nos lectures de matchs, rédigées par la rédaction. Un pronostic reste un avis : aucun résultat n'est garanti."
      />

      <section className="container-site mt-10">
        <FilterPills items={sports} value={filter} onChange={setFilter} />

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PredictionCard key={p.slug} prediction={p} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-muted-foreground py-8">
            Aucun pronostic ne correspond à ce filtre pour le moment.
          </p>
        )}
      </section>

      <ResponsibleGamblingSection />
    </>
  );
}
