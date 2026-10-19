import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { Bookmaker } from '../types/index.ts';
import { BookmakerCard } from '../components/BookmakerCard.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { FilterPills } from '../components/FilterPills.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

export function BookmakersPage() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [filter, setFilter] = useState('Tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBookmakers();
        setBookmakers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filterOptions = [
    'Tous',
    'Paris en direct',
    'Application mobile',
    'Streaming',
    'Paiements mobiles',
    'Promotions',
  ];

  const filtered =
    filter === 'Tous'
      ? bookmakers
      : bookmakers.filter((b) => b.features?.includes(filter));

  return (
    <>
      <SEOHead
        title="Bookmakers : comparatif et avis | CoupFranc"
        description="Découvrez les opérateurs présentés sur notre site. Filtrez selon les fonctionnalités qui comptent pour vous."
        canonicalPath="/bookmakers"
      />

      <PageHeader
        kicker="Annuaire"
        title="Bookmakers"
        intro="Découvrez les opérateurs présentés sur notre site. Filtrez selon les fonctionnalités qui comptent pour vous."
      />

      <section className="container-site mt-10">
        <FilterPills items={filterOptions} value={filter} onChange={setFilter} />

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((b) => (
              <BookmakerCard key={b.slug} bookmaker={b} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-muted-foreground py-8">
            Aucun bookmaker ne correspond à ce filtre.
          </p>
        )}
      </section>

      <ResponsibleGamblingSection />
    </>
  );
}
