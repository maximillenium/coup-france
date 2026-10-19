import { Lock } from 'lucide-react';
import { Link } from '../utils/navigation.tsx';

export function Footer() {
  const navLinks = [
    { to: '/bookmakers', label: 'Bookmakers' },
    { to: '/bonus', label: 'Bonus' },
    { to: '/pronostics', label: 'Pronostics' },
    { to: '/actualites', label: 'Actualités' },
    { to: '/a-propos', label: 'À propos' },
    { to: '/contact', label: 'Contact' },
  ];

  const legalLinks = [
    { to: '/mentions-legales', label: 'Mentions légales' },
    { to: '/politique-de-confidentialite', label: 'Politique de confidentialité' },
    { to: '/gestion-des-cookies', label: 'Gestion des cookies' },
    { to: '/jeu-responsable', label: 'Jeu responsable' },
  ];

  return (
    <footer className="mt-20 bg-ink text-ink-foreground">
      <div className="container-site grid gap-10 py-14 md:grid-cols-4">
        {/* Brand statement */}
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-accent font-display text-xl font-extrabold text-accent-foreground">
              CF
            </span>
            <span className="font-display text-2xl font-extrabold uppercase tracking-wide">
              Coup<span className="text-accent">Franc</span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm text-ink-foreground/70 leading-relaxed">
            Média indépendant consacré aux paris sportifs : présentations d'opérateurs, pronostics éditoriaux et actualités. Ce site peut percevoir une commission via des liens affiliés.
          </p>
        </div>

        {/* Navigation list */}
        <div>
          <h3 className="kicker text-accent">Navigation</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-foreground/75">
            {navLinks.map((item) => (
              <li key={item.to}>
                <Link href={item.to} className="hover:text-accent transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Informations */}
        <div>
          <h3 className="kicker text-accent">Informations</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-foreground/75">
            {legalLinks.map((item) => (
              <li key={item.to}>
                <Link href={item.to} className="hover:text-accent transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-ink-foreground/10">
        <div className="container-site py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-foreground/60">
          <p>
            © 2026 CoupFranc · 18+ · Jouer comporte des risques : endettement, isolement, dépendance. Pour être aidé, appelez le 09 74 75 13 13 (appel non surtaxé).
          </p>
          <Link
            href="/admin"
            className="text-ink-foreground/30 hover:text-accent flex items-center gap-1 shrink-0 transition-colors"
          >
            <Lock className="w-3 h-3" />
            <span>Console Admin</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
