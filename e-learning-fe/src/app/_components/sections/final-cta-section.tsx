import { ButtonLink } from "@/components/ui/button-link";

import type { HomeAction } from "../home-content";

type FinalCtaSectionProps = {
  description: string;
  primaryAction: HomeAction;
  secondaryAction: HomeAction;
  title: string;
};

export function FinalCtaSection({
  description,
  primaryAction,
  secondaryAction,
  title,
}: FinalCtaSectionProps) {
  return (
    <section className="bg-surface-dark-3 text-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 py-16 text-center sm:px-8 lg:px-12 lg:py-24">
        <h2 className="max-w-4xl text-3xl font-semibold leading-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
          {description}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href={primaryAction.href}>
            {primaryAction.label}
          </ButtonLink>
          <ButtonLink href={secondaryAction.href} variant="ghostOnDark">
            {secondaryAction.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
