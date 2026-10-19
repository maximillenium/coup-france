interface PageHeaderProps {
  kicker: string;
  title: string;
  intro?: string;
}

export function PageHeader({ kicker, title, intro }: PageHeaderProps) {
  return (
    <section className="bg-gradient-ink text-ink-foreground">
      <div className="container-site py-14 md:py-20">
        <p className="kicker text-accent">{kicker}</p>
        <h1 className="mt-2 text-5xl font-extrabold uppercase md:text-6xl font-display">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-2xl text-ink-foreground/75 leading-relaxed">{intro}</p>}
      </div>
    </section>
  );
}
