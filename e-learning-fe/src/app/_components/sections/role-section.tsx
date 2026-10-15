import { SectionHeader } from "@/components/ui/section-header";

import type { HomeValueCard } from "../home-content";

type RoleSectionProps = {
  outcomes: HomeValueCard[];
  trustCards: HomeValueCard[];
};

export function RoleSection({ outcomes, trustCards }: RoleSectionProps) {
  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <SectionHeader
          description="The homepage speaks to learners first while still showing the platform is ready for instructors, reviewers, and admins."
          eyebrow="Why learn here"
          title="A cleaner path from discovery to course progress."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {outcomes.map((outcome) => (
            <article
              key={outcome.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <p className="text-sm font-semibold text-primary">
                {outcome.eyebrow}
              </p>
              <h3 className="text-2xl font-semibold leading-tight">
                {outcome.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {outcome.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-8 rounded-lg border border-border bg-surface-pearl p-6 lg:grid-cols-[0.75fr_1fr] lg:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">Platform trust</p>
            <h3 className="mt-2 text-3xl font-semibold leading-tight">
              Built around real catalog behavior.
            </h3>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The landing page is connected to the same course discovery flow
              learners use after they leave the homepage.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {trustCards.map((card) => (
              <article
                className="rounded-lg border border-border bg-card p-5"
                key={card.title}
              >
                <p className="text-xs font-semibold uppercase text-primary">
                  {card.eyebrow}
                </p>
                <h4 className="mt-3 text-lg font-semibold leading-tight">
                  {card.title}
                </h4>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
