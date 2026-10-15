import Link from "next/link";

import type { HomeFooterGroup } from "../home-content";

type FooterSectionProps = {
  brand: string;
  demoNote: string;
  groups: HomeFooterGroup[];
  notice: string;
};

export function FooterSection({
  brand,
  demoNote,
  groups,
  notice,
}: FooterSectionProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <p className="text-base font-semibold">{notice}</p>
          <Link
            className="text-sm font-semibold text-primary-on-dark transition-colors hover:text-white"
            href="/courses"
          >
            Browse demo courses
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-white transition-opacity hover:opacity-80"
              href="/"
            >
              <span className="grid size-9 place-items-center rounded-md bg-white text-sm font-semibold text-surface-dark">
                EL
              </span>
              <span className="text-base font-semibold">{brand}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              A course marketplace demo built for learning full-stack platform
              workflows.
            </p>
          </div>

          {groups.map((group) => (
            <nav aria-label={group.title} key={group.title}>
              <h2 className="text-sm font-semibold text-white">
                {group.title}
              </h2>
              <ul className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.label}`}>
                    <Link
                      className="text-sm text-white/65 transition-colors hover:text-primary-on-dark"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {brand} © {year}
          </p>
          <p>{demoNote}</p>
        </div>
      </div>
    </footer>
  );
}
