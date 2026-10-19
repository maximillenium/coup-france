import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { Bookmaker } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';
import { InitialsLogo, PromoCopyButton } from '../components/BookmakerCard.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

interface Props {
  slug: string;
}

export function BookmakerDetailPage({ slug }: Props) {
  const [bookmaker, setBookmaker] = useState<Bookmaker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBookmakerBySlug(slug);
        setBookmaker(data);
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
        <p className="text-muted-foreground">Chargement de la fiche...</p>
      </div>
    );
  }

  if (!bookmaker) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="text-4xl font-bold font-display uppercase">Bookmaker introuvable</h1>
        <Link href="/bookmakers" className="mt-4 inline-block underline decoration-accent hover:text-accent">
          ← Tous les bookmakers
        </Link>
      </div>
    );
  }

  const sportsList = bookmaker.sports && bookmaker.sports.length > 0
    ? bookmaker.sports
    : ['Football', 'Tennis', 'Basketball', 'eSport'];

  return (
    <>
      <SEOHead
        title={`${bookmaker.name} : avis, offre et code promo | CoupFranc`}
        description={bookmaker.tagline || bookmaker.shortDescription}
        canonicalPath={`/bookmakers/${bookmaker.slug}`}
      />

      {/* Header Banner */}
      <section className="bg-gradient-ink text-ink-foreground">
        <div className="container-site flex flex-col gap-6 py-14 md:flex-row md:items-center">
          <InitialsLogo b={bookmaker} size="lg" />
          <div>
            <Link
              href="/bookmakers"
              className="text-sm text-ink-foreground/60 hover:text-accent transition-colors block mb-1"
            >
              ← Bookmakers
            </Link>
            <h1 className="text-6xl font-extrabold uppercase font-display">
              {bookmaker.name}
            </h1>
            <p className="text-ink-foreground/75 text-lg mt-1 font-sans">
              {bookmaker.tagline || bookmaker.shortDescription}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container-site mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Left Column: Review & Details */}
        <div className="prose-site">
          <h2>Présentation</h2>
          <p>{bookmaker.fullDescription || bookmaker.shortDescription}</p>

          <h2>Fonctionnalités</h2>
          <ul>
            {bookmaker.features?.map((feat) => (
              <li key={feat}>{feat}</li>
            ))}
          </ul>

          <h2>Sports proposés</h2>
          <p>{sportsList.join(', ')} (liste indicative à vérifier).</p>

          <h2>Conditions de l'offre</h2>
          <ul>
            <li>18+. Réservé aux joueurs majeurs dans les territoires autorisés.</li>
            <li>{bookmaker.offerTerms}</li>
            <li>Conditions de mise et cotes minimales à vérifier sur le site de l'opérateur.</li>
          </ul>
        </div>

        {/* Right Sticky Sidebar: Offer Box */}
        <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-28">
          <p className="kicker text-muted-foreground">Offre</p>
          <p className="mt-1 text-2xl font-bold font-display uppercase text-foreground">
            {bookmaker.bonusSummary}
          </p>

          <p className="mt-4 mb-1 text-xs text-muted-foreground">Code promo (exemple non valide)</p>
          <PromoCopyButton code={bookmaker.promoCode || 'CODE-EXEMPLE'} />

          <a
            href={bookmaker.affiliateUrl || '#'}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="mt-4 block rounded-md bg-accent px-4 py-3 text-center font-bold text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Accéder au site de {bookmaker.name}
          </a>

          <p className="mt-3 text-xs text-muted-foreground">
            Lien affilié (à configurer). 18+. Jouer comporte des risques.
          </p>
        </aside>
      </div>

      <ResponsibleGamblingSection />
    </>
  );
}
