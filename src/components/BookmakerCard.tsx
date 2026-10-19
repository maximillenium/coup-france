import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Bookmaker } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';

interface BookmakerCardProps {
  bookmaker: Bookmaker;
  rank?: number;
}

export function InitialsLogo({ b, size = 'md' }: { b: Bookmaker; size?: 'md' | 'lg' }) {
  const initials = b.initials || b.name.slice(0, 2).toUpperCase();
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-lg bg-gradient-ink font-display font-extrabold text-accent ${
        size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-14 w-14 text-2xl'
      }`}
      title={b.name}
    >
      {initials}
    </div>
  );
}

export function PromoCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex w-full items-center justify-between rounded-md border-2 border-dashed border-primary/30 bg-muted px-3 py-2 font-mono text-sm font-bold transition-colors cursor-pointer"
      aria-label="Copier le code promo"
    >
      <span>{code}</span>
      <span className="flex items-center gap-1 text-xs font-sans text-muted-foreground font-normal">
        {copied ? <Check className="h-4 w-4 text-foreground" /> : <Copy className="h-4 w-4" />}
        <span>{copied ? 'Copié' : 'Copier'}</span>
      </span>
    </button>
  );
}

export function BookmakerCard({ bookmaker: b }: BookmakerCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift">
      <div className="flex items-center gap-4">
        <InitialsLogo b={b} />
        <div>
          <h3 className="text-2xl font-extrabold uppercase font-display text-foreground">{b.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{b.tagline || b.shortDescription}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-accent/25 p-3">
        <p className="kicker text-xs text-accent-foreground/80">Offre</p>
        <p className="font-semibold text-foreground text-sm">{b.bonusSummary}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {b.features?.map((feat) => (
          <span
            key={feat}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {feat}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs text-muted-foreground">Code promo (exemple non valide)</p>
        <PromoCopyButton code={b.promoCode || 'CODE-EXEMPLE'} />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        18+ · Conditions à confirmer · Voir CG de l'opérateur
      </p>

      <div className="mt-auto flex gap-2 pt-4">
        <Link
          href={`/bookmakers/${b.slug}`}
          className="flex-1 rounded-md border-2 border-primary px-3 py-2.5 text-center text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Fiche détaillée
        </Link>
        <a
          href={b.affiliateUrl || '#'}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="flex-1 rounded-md bg-accent px-3 py-2.5 text-center text-sm font-bold text-accent-foreground hover:opacity-90 transition-opacity"
        >
          Voir l'offre
        </a>
      </div>
    </article>
  );
}
