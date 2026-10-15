import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";

import type { HomeAction, HomeHeroImage } from "../home-content";

type HeroSectionProps = {
  benefits: string[];
  description: string;
  eyebrow: string;
  image: HomeHeroImage;
  primaryAction: HomeAction;
  searchPlaceholder: string;
  secondaryAction: HomeAction;
  title: string;
};

export function HeroSection({
  benefits,
  description,
  eyebrow,
  image,
  primaryAction,
  searchPlaceholder,
  secondaryAction,
  title,
}: HeroSectionProps) {
  return (
    <section className="bg-surface-pearl">
      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-center lg:px-12 lg:py-20">
        <div>
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-[60px]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            {description}
          </p>

          <form
            action="/courses"
            className="mt-8 flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-border bg-card p-2 shadow-[0_16px_50px_rgb(0_0_0_/_10%)] sm:flex-row"
            method="get"
          >
            <label className="sr-only" htmlFor="home-course-search">
              Search courses
            </label>
            <input
              className="min-h-12 flex-1 rounded-md border border-transparent bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              id="home-course-search"
              name="search"
              placeholder={searchPlaceholder}
              type="search"
            />
            <button
              className="min-h-12 rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-transform active:scale-95"
              type="submit"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={primaryAction.href}>
              {primaryAction.label}
            </ButtonLink>
            <ButtonLink href={secondaryAction.href} variant="secondary">
              {secondaryAction.label}
            </ButtonLink>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {benefits.map((benefit) => (
              <Badge key={benefit}>{benefit}</Badge>
            ))}
          </div>
        </div>

        <figure className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-[0_20px_70px_rgb(0_0_0_/_18%)]">
          <Image
            alt={image.alt}
            className="h-auto w-full rounded-md"
            height={image.height}
            priority
            src={image.src}
            width={image.width}
          />
          <figcaption className="absolute bottom-6 left-6 right-6 rounded-lg border border-white/20 bg-surface-black/85 p-4 text-white backdrop-blur">
            <p className="text-sm font-semibold">Popular right now</p>
            <p className="mt-1 text-sm text-white/70">
              Browse live courses by category, level, and price.
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
