import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { Article } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

interface Props {
  slug: string;
}

export function ArticleDetailPage({ slug }: Props) {
  const [article, setArticle] = useState<Article | null>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [art, all] = await Promise.all([
          api.getArticleBySlug(slug),
          api.getArticles(),
        ]);
        setArticle(art);
        setAllArticles(all);
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
        <p className="text-muted-foreground">Chargement de l'article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="text-4xl font-bold font-display uppercase">Article introuvable</h1>
        <Link href="/actualites" className="mt-4 inline-block underline decoration-accent hover:text-accent">
          ← Toutes les actualités
        </Link>
      </div>
    );
  }

  const dateFormatted = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '12 octobre 2026';

  const related = allArticles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <SEOHead
        title={`${article.title} | CoupFranc`}
        description={article.excerpt}
        ogImage={article.featuredImage}
        canonicalPath={`/actualites/${article.slug}`}
      />

      {/* Header Banner */}
      <section className="bg-gradient-ink text-ink-foreground">
        <div className="container-site max-w-3xl py-14">
          <Link
            href="/actualites"
            className="text-sm text-ink-foreground/60 hover:text-accent transition-colors block mb-1"
          >
            ← Actualités
          </Link>
          <p className="kicker mt-4 text-accent">{article.category}</p>
          <h1 className="mt-2 text-5xl font-extrabold md:text-6xl font-display leading-tight">
            {article.title}
          </h1>
          <p className="mt-4 text-sm text-ink-foreground/60 font-sans">
            {dateFormatted} · {article.readingTime} de lecture
          </p>
        </div>
      </section>

      {/* Article Body */}
      <article
        className="container-site prose-site mt-10 max-w-3xl text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Related articles: À lire aussi */}
      {related.length > 0 && (
        <section className="container-site mt-14">
          <h2 className="mb-6 text-3xl font-extrabold uppercase font-display">
            À lire aussi
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}

      <ResponsibleGamblingSection />
    </>
  );
}
