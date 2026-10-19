import { useEffect, useState } from 'react';
import { api } from '../utils/api.ts';
import { InformationalPage } from '../types/index.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { ResponsibleGamblingSection } from '../components/ResponsibleGamblingSection.tsx';
import { SEOHead } from '../components/SEOHead.tsx';

interface Props {
  slug: string;
}

export function InformationalPageViewer({ slug }: Props) {
  const [page, setPage] = useState<InformationalPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Contact form state
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState('Question générale');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPage(slug);
        setPage(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  if (loading) {
    return (
      <div className="container-site py-20 text-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="text-4xl font-bold font-display uppercase">Page introuvable</h1>
      </div>
    );
  }

  const kickers: Record<string, string> = {
    'contact': 'Écrivez-nous',
    'a-propos': 'Qui sommes-nous',
    'mentions-legales': 'Informations',
    'politique-de-confidentialite': 'Données personnelles',
    'gestion-des-cookies': 'Traceurs',
    'jeu-responsable': 'Prévention',
  };

  const inputClass =
    'w-full rounded-md border border-input bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring text-sm mt-1';

  return (
    <>
      <SEOHead
        title={`${page.title} | CoupFranc`}
        description={page.metaDescription}
        canonicalPath={`/${page.slug}`}
      />

      <PageHeader
        kicker={kickers[page.slug] || 'Information'}
        title={page.title}
        intro={
          slug === 'contact'
            ? 'Une question, une demande de partenariat ou une erreur à signaler ? Nous vous répondons rapidement.'
            : undefined
        }
      />

      {slug === 'contact' ? (
        <div className="container-site mt-10 max-w-2xl">
          {contactSubmitted ? (
            <div className="rounded-xl border-l-4 border-accent bg-card p-6 shadow-card">
              <h2 className="text-2xl font-bold font-display uppercase text-foreground">Merci !</h2>
              <p className="text-muted-foreground mt-1">
                Votre message a bien été pris en compte (démonstration : aucun envoi réel pour le moment).
              </p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
              <label className="block text-sm font-semibold text-foreground">
                Nom
                <input
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className={inputClass}
                  name="nom"
                />
              </label>

              <label className="block text-sm font-semibold text-foreground">
                E-mail
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  name="email"
                />
              </label>

              <label className="block text-sm font-semibold text-foreground">
                Sujet
                <select
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  className={inputClass}
                  name="sujet"
                >
                  <option value="Question générale">Question générale</option>
                  <option value="Partenariat">Partenariat</option>
                  <option value="Signaler une erreur">Signaler une erreur</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-foreground">
                Message
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={inputClass}
                  name="message"
                />
              </label>

              <button
                type="submit"
                className="rounded-md bg-accent px-6 py-3 font-bold text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer font-display uppercase tracking-wide text-base"
              >
                Envoyer
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="container-site prose-site mt-10 max-w-3xl">
          <p className="rounded-md bg-warning/15 border border-warning/30 p-3 text-sm text-foreground mb-6">
            Contenu provisoire : ce texte doit être relu et complété par un professionnel du droit avant publication.
          </p>

          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
      )}

      <ResponsibleGamblingSection />
    </>
  );
}
