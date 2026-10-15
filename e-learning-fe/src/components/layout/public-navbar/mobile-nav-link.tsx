import Link from "next/link";

type MobileNavLinkProps = {
  href: string;
  label: string;
};

export function MobileNavLink({ href, label }: MobileNavLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 shrink-0 items-center rounded-pill border border-border bg-card px-3 text-xs font-semibold text-ink-muted transition-colors hover:border-primary hover:text-primary md:hidden"
    >
      {label}
    </Link>
  );
}
