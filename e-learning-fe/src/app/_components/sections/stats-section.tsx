import type { HomeStat } from "../home-content";

type StatsSectionProps = {
  stats: HomeStat[];
};

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="bg-surface-dark text-white">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-5 py-12 sm:grid-cols-3 sm:px-8 lg:px-12 lg:py-16">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/10 bg-white/5 p-6 text-center"
          >
            <p className="text-4xl font-semibold leading-none text-primary-on-dark">
              {stat.value}
            </p>
            <p className="mt-3 text-sm font-normal text-white/70">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
