import Link from "next/link";

export type PublicNavLink = {
  href: string;
  label: string;
};

type NavLinkProps = {
  link: PublicNavLink;
};

export function NavLink({ link }: NavLinkProps) {
  return (
    <Link
      href={link.href}
      className="inline-flex min-h-9 items-center rounded-pill px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-muted hover:text-foreground"
    >
      {link.label}
    </Link>
  );
}
