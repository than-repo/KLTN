import Link from "next/link";

export function LearningPageSkeleton() {
  return (
    <main className="min-h-screen bg-surface-pearl px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-h-[560px] rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="h-8 w-2/3 rounded-md bg-muted" />
          <div className="mt-5 aspect-video rounded-lg bg-muted" />
          <div className="mt-5 h-10 w-3/4 rounded-md bg-muted" />
          <div className="mt-4 h-24 rounded-md bg-muted" />
        </section>
        <aside className="hidden min-h-[560px] rounded-lg border border-border bg-card p-4 shadow-sm lg:block">
          <div className="h-8 w-1/2 rounded-md bg-muted" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-16 rounded-md bg-muted" key={index} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

export function LearningAccessState({
  actionHref,
  actionLabel,
  message,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  message: string;
  title: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-pearl px-5 text-center text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card px-5 py-12 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Learning workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      </section>
    </main>
  );
}
