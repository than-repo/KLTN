import Link from "next/link";

export function WishlistEmptyState() {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-16 text-center">
      <svg
        aria-hidden="true"
        className="mx-auto h-12 w-12 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M4.318 6.318a3.125 3.125 0 0 1 4.424 0l1.59 1.59 1.59-1.59a3.125 3.125 0 0 1 4.424 0l1.59 1.59a3.125 3.125 0 0 1-4.424 4.424L12 14.17l-3.592 3.592a3.125 3.125 0 0 1-4.424-4.424l1.59-1.59z"
        />
      </svg>
      <h2 className="mt-6 text-2xl font-semibold">Your wishlist is empty</h2>
      <p className="mt-2 max-w-xs mx-auto text-sm leading-6 text-muted-foreground">
        Sign in and save courses you love so you can find them easily later.
      </p>
      <div className="mt-8">
        <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus" href="/courses">
          Browse courses
        </Link>
      </div>
    </div>
  );
}
