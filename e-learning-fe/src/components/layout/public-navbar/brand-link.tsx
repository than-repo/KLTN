import Link from "next/link";

type BrandLinkProps = {
  href?: string;
  label: string;
};

export function BrandLink({ href = "/", label }: BrandLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center gap-2 text-foreground transition-opacity hover:opacity-80"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground text-sm font-semibold text-background">
        EL
      </span>
      <span className="truncate text-sm font-semibold leading-tight sm:text-base">
        {label}
      </span>
    </Link>
  );
}
