import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { Bookmaker } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { InitialsLogo, PromoCopyButton } from '../components/BookmakerCard.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

export function BonusesPage() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
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

  return (
    <>
      <SEOHead
        title="Bonus bookmakers et offres de bienvenue | CoupFranc"
        description="Toutes les offres présentées sur une seule page. Les montants et conditions sont en cours de vérification."
        canonicalPath="/bonus"
      />

      <PageHeader
        kicker="Offres"
        title="Bonus"
        intro="Toutes les offres présentées sur une seule page. Les montants et conditions sont en cours de vérification."
      />

      <section className="container-site mt-10 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          bookmakers.map((b) => (
            <article
              key={b.slug}
              className="grid items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card md:grid-cols-[auto_1fr_16rem_auto]"
            >
              <InitialsLogo b={b} />

              <div>
                <h2 className="text-2xl font-extrabold uppercase font-display text-foreground">
                  {b.name}
                </h2>
                <p className="font-semibold text-foreground text-sm">{b.bonusSummary}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  18+ · Conditions de l'opérateur applicables
                </p>
              </div>

              <div>
                <PromoCopyButton code={b.promoCode || 'CODE-EXEMPLE'} />
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/bookmakers/${b.slug}`}
                  className="rounded-md border-2 border-primary px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-center"
                >
                  Détails
                </Link>
                <a
                  href={b.affiliateUrl || '#'}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90 transition-opacity text-center whitespace-nowrap"
                >
                  Voir l'offre
                </a>
              </div>
            </article>
          ))
        )}
      </section>

      <ResponsibleGamblingSection />
    </>
  );
}
