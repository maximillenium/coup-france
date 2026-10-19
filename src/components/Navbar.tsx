import { useState } from 'react';
import { Menu, X, Lock } from 'lucide-react';
import { Link, useRouter } from '../utils/navigation.tsx';
import { ResponsibleGamblingBanner } from './ResponsibleGamblingBanner.tsx';

export function Navbar() {
  const { path } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/bookmakers', label: 'Bookmakers' },
    { href: '/bonus', label: 'Bonus' },
    { href: '/pronostics', label: 'Pronostics' },
    { href: '/actualites', label: 'Actualités' },
    { href: '/a-propos', label: 'À propos' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-ink text-ink-foreground">
      <ResponsibleGamblingBanner />

      <div className="container-site flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent font-display text-xl font-extrabold text-accent-foreground">
            CF
          </span>
          <span className="font-display text-2xl font-extrabold uppercase tracking-wide">
            Coup<span className="text-accent">Franc</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 font-display text-lg font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? 'text-accent'
                    : 'text-ink-foreground/75 hover:text-ink-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/contact"
            className="ml-2 rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Contact
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-ink-foreground hover:text-accent"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav className="container-site flex flex-col gap-1 pb-4 lg:hidden border-t border-ink-foreground/10 pt-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-md px-3 py-2 font-display text-lg font-semibold uppercase hover:bg-ink-foreground/10 ${
                isActive(item.href) ? 'text-accent' : 'text-ink-foreground/90'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md px-3 py-2 font-display text-lg font-semibold uppercase text-accent hover:bg-ink-foreground/10"
          >
            Contact
          </Link>
        </nav>
      )}
    </header>
  );
}
