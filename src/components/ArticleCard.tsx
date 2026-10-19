import { Clock } from 'lucide-react';
import { Article } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article: a }: ArticleCardProps) {
  const dateFormatted = a.publishedAt
    ? new Date(a.publishedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '12 octobre 2026';

  return (
    <Link
      href={`/actualites/${a.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="relative h-36 bg-gradient-ink">
        <span className="absolute bottom-3 left-4 rounded bg-accent px-2 py-0.5 text-xs font-bold uppercase text-accent-foreground font-display">
          {a.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-2xl font-bold leading-tight group-hover:underline font-display text-foreground">
          {a.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
          {a.excerpt}
        </p>
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-muted-foreground">
          <span>{dateFormatted}</span>
          <span aria-hidden="true">·</span>
          <Clock className="h-3 w-3" />
          <span>{a.readingTime}</span>
        </p>
      </div>
    </Link>
  );
}
