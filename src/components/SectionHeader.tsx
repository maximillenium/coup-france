import { Link } from '../utils/navigation.tsx';

interface SectionHeaderProps {
  kicker: string;
  title: string;
  to?: string;
  linkLabel?: string;
}

export function SectionHeader({ kicker, title, to, linkLabel }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="kicker text-muted-foreground">{kicker}</p>
        <h2 className="text-4xl font-extrabold uppercase font-display text-foreground">{title}</h2>
      </div>
      {to && (
        <Link
          href={to}
          className="shrink-0 text-sm font-bold underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
