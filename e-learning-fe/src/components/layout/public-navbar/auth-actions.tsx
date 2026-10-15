import Link from "next/link";

import { UserMenu, type PublicNavbarUser } from "./user-menu";

type AuthActionsProps = {
  currentUser?: PublicNavbarUser | null;
  onLogout?: () => Promise<void> | void;
};

export function AuthActions({
  currentUser = null,
  onLogout,
}: AuthActionsProps) {
  if (currentUser) {
    return <UserMenu onLogout={onLogout} user={currentUser} />;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        className="inline-flex min-h-9 items-center justify-center rounded-pill px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:px-4"
        href="/login"
      >
        Login
      </Link>
      <Link
        className="inline-flex min-h-9 items-center justify-center rounded-pill border border-foreground bg-foreground px-3 text-sm font-semibold text-background transition-transform active:scale-95 sm:px-4"
        href="/register"
      >
        Register
      </Link>
    </div>
  );
}
