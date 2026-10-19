import { SportsPrediction } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';

interface PredictionCardProps {
  prediction: SportsPrediction;
}

const confidenceStyles: Record<string, string> = {
  Faible: 'bg-muted text-foreground',
  Moyenne: 'bg-warning/30 text-foreground',
  Élevée: 'bg-accent/50 text-foreground',
};

export function PredictionCard({ prediction: p }: PredictionCardProps) {
  const conf =
    p.confidence ||
    (p.confidencePercent >= 80 ? 'Élevée' : p.confidencePercent >= 60 ? 'Moyenne' : 'Faible');

  const displayDate = p.eventTime ? `${p.eventDate} · ${p.eventTime}` : p.eventDate;

  return (
    <Link
      href={`/pronostics/${p.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="kicker text-muted-foreground">
          {p.sport} · {p.competition}
        </span>
        <span className="text-muted-foreground">{displayDate}</span>
      </div>

      <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <span className="font-display text-xl font-bold uppercase truncate text-foreground">
          {p.homeTeam}
        </span>
        <span className="rounded bg-primary px-2 py-0.5 font-display text-sm font-bold text-primary-foreground">
          VS
        </span>
        <span className="font-display text-xl font-bold uppercase truncate text-foreground">
          {p.awayTeam}
        </span>
      </div>

      <div className="rounded-lg bg-muted p-3">
        <p className="text-xs text-muted-foreground">Notre avis</p>
        <p className="font-semibold text-foreground text-sm">{p.predictionChoice}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${confidenceStyles[conf] || 'bg-muted'}`}>
          Confiance : {conf}
        </span>
        <span className="text-sm font-bold text-foreground group-hover:underline">
          Lire l'analyse →
        </span>
      </div>
    </Link>
  );
}
