import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  className?: string;
  description?: string;
  tone?: "light" | "dark";
};

export function SectionHeader({
  action,
  className = "",
  description,
  eyebrow,
  tone = "light",
  title,
}: SectionHeaderProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={[
        "mx-auto flex max-w-4xl flex-col items-center gap-4 text-center",
        className,
      ].join(" ")}
    >
      <div>
        <p
          className={[
            "text-sm font-semibold",
            isDark ? "text-primary-on-dark" : "text-primary",
          ].join(" ")}
        >
          {eyebrow}
        </p>
        <h2
          className={[
            "mt-3 text-3xl font-semibold leading-tight sm:text-4xl",
            isDark ? "text-white" : "text-foreground",
          ].join(" ")}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={[
              "mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg",
              isDark ? "text-white/70" : "text-muted-foreground",
            ].join(" ")}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
