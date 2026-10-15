import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { UserRole } from "@/features/auth/types/auth";

export type PublicNavbarUser = {
  name: string;
  email?: string;
  role?: UserRole;
};

type UserMenuProps = {
  onLogout?: () => Promise<void> | void;
  user: PublicNavbarUser;
};

export function UserMenu({ onLogout, user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex min-h-9 cursor-pointer items-center gap-2 rounded-pill border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="grid size-6 place-items-center rounded-pill bg-primary/10 text-xs font-semibold text-primary">
          {getInitial(user.name)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 z-10 mt-3 w-64 rounded-lg border border-border bg-card p-2 text-foreground shadow-[0_18px_50px_rgb(0_0_0_/_14%)]"
          role="menu"
        >
          {user.email ? (
            <div className="border-b border-border px-3 pb-3 pt-2">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          ) : null}
          {user.role === "LEARNER" ? (
            <Link
              href="/my-courses"
              className="mt-2 block rounded-md px-3 py-2 text-sm font-normal hover:bg-muted"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              My courses
            </Link>
          ) : null}

          {user.role === "LEARNER" ? (
            <Link
              href="/my-payments"
              className="mt-2 block rounded-md px-3 py-2 text-sm font-normal hover:bg-muted"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              My payments
            </Link>
          ) : null}

          <Link
            href="/settings"
            className="mt-2 block rounded-md px-3 py-2 text-sm font-normal hover:bg-muted"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            Settings
          </Link>

          <button
            onClick={() => {
              setIsOpen(false);
              void onLogout?.();
            }}
            type="button"
            className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm font-normal text-danger hover:bg-muted"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}
