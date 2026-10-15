import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";
import type { CategoryTreeNode } from "@/features/courses/types/course";

type CategorySectionProps = {
  categories: CategoryTreeNode[];
  isUnavailable: boolean;
};

export function CategorySection({
  categories,
  isUnavailable,
}: CategorySectionProps) {
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-primary">
              Popular categories
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight">
              Start with a topic.
            </h2>
          </div>

          {isUnavailable ? (
            <div className="rounded-lg border border-border bg-surface-pearl p-5">
              <p className="text-base font-semibold">
                Categories are unavailable right now.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You can still open the catalog and search all published courses.
              </p>
              <ButtonLink className="mt-4" href="/courses" size="sm">
                Browse courses
              </ButtonLink>
            </div>
          ) : categories.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Link
                  className="rounded-pill border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                  href={`/courses?categoryId=${encodeURIComponent(category.id)}`}
                  key={category.id}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface-pearl p-5">
              <p className="text-base font-semibold">
                Categories are coming soon.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Browse the full catalog to see all currently published courses.
              </p>
              <ButtonLink className="mt-4" href="/courses" size="sm">
                Browse courses
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
