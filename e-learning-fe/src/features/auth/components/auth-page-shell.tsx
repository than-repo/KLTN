import Link from "next/link";
import type { ReactNode } from "react";

import { AuthIllustration } from "./auth-illustration";

type AuthPageShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function AuthPageShell({
  children,
  description,
  eyebrow,
  title,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-muted text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
          <Link
            className="w-fit text-sm font-semibold transition-colors hover:text-primary"
            href="/"
          >
            E-Learning System
          </Link>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-12 text-center lg:items-start lg:text-left">
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
            <div className="mt-10 w-full">
              <AuthIllustration />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-background px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
