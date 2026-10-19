import { AlertTriangle } from 'lucide-react';
import { Link } from '../utils/navigation.tsx';

export function ResponsibleGamblingSection() {
  return (
    <section className="container-site my-16">
      <div className="flex flex-col gap-4 rounded-xl border-2 border-warning/60 bg-warning/10 p-6 md:flex-row md:items-center">
        <AlertTriangle className="h-10 w-10 shrink-0 text-warning" />
        <div className="flex-1">
          <h2 className="text-2xl font-bold uppercase font-display text-foreground">
            Jouer comporte des risques
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les paris sportifs sont réservés aux personnes majeures. Aucun pronostic ne garantit un gain. Fixez-vous des limites et demandez de l'aide si le jeu devient un problème.
          </p>
        </div>
        <Link
          href="/jeu-responsable"
          className="rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap text-center"
        >
          Jeu responsable
        </Link>
      </div>
    </section>
  );
}
