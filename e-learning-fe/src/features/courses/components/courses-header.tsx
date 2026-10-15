type CoursesHeaderProps = {
  total: number;
};

export function CoursesHeader({ total }: CoursesHeaderProps) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Course catalog
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
              Build practical skills with expert-led courses.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Browse focused learning paths, compare course details, and enroll
              when you are ready to start.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card px-5 py-4 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Available courses
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {total}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
