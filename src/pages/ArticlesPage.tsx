import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { Article } from '../types/index.ts';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { FilterPills } from '../components/FilterPills.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState('Tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getArticles();
        setArticles(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ['Tous', 'Guides', 'Analyses', 'Jeu responsable'];

  const filtered =
    filter === 'Tous'
      ? articles
      : articles.filter((a) => a.category.toLowerCase() === filter.toLowerCase());

  return (
    <>
      <SEOHead
        title="Actualités, guides et dossiers | CoupFranc"
        description="Guides pratiques, analyses et dossiers de la rédaction."
        canonicalPath="/actualites"
      />

      <PageHeader
        kicker="Rédaction"
        title="Actualités"
        intro="Guides pratiques, analyses et dossiers de la rédaction."
      />

      <section className="container-site mt-10">
        <FilterPills items={categories} value={filter} onChange={setFilter} />

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-muted-foreground py-8">
            Aucun article ne correspond à ce filtre pour le moment.
          </p>
        )}
      </section>

      <ResponsibleGamblingSection />
    </>
  );
}
