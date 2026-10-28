"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/hooks/use-auth";
import type { UserRole } from "@/features/auth/types/auth";

import { AuthActions } from "./auth-actions";
import { BrandLink } from "./brand-link";
import { DesktopNav } from "./desktop-nav";
import { MobileNavLink } from "./mobile-nav-link";
import { NavbarSearch } from "./navbar-search";
import type { PublicNavLink } from "./nav-link";
import type { PublicNavbarUser } from "./user-menu";

type PublicNavbarProps = {
  brandLabel: string;
  links: PublicNavLink[];
  currentUser?: PublicNavbarUser | null;
};

export function PublicNavbar({
  brandLabel,
  currentUser = null,
  links,
}: PublicNavbarProps) {
  const router = useRouter();
  const { logout, status, user } = useAuth();
  const resolvedLinks =
    status === "authenticated" && user ? addRoleLinks(links, user.role) : links;
  const sessionUser =
    status === "authenticated" && user
      ? { email: user.email, name: user.fullName, role: user.role }
      : null;
  const resolvedUser = currentUser ?? sessionUser;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 text-foreground shadow-[0_8px_28px_rgb(0_0_0_/_6%)] backdrop-blur">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex min-h-16 items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4 md:flex-none">
            <BrandLink label={brandLabel} />
            <DesktopNav links={resolvedLinks} />
          </div>

          <NavbarSearch
            className="hidden max-w-2xl flex-1 md:flex"
            id="navbar-course-search"
          />

          <div className="ml-auto flex shrink-0">
            <AuthActions currentUser={resolvedUser} onLogout={handleLogout} />
          </div>
        </div>

        <div className="grid gap-3 pb-4 md:hidden">
          <NavbarSearch id="navbar-mobile-course-search" />
          {resolvedLinks.length > 0 ? (
            <nav
              aria-label="Mobile navigation"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {resolvedLinks.map((link) => (
                <MobileNavLink
                  href={link.href}
                  key={link.href}
                  label={link.label}
                />
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function addRoleLinks(links: PublicNavLink[], role: UserRole) {
  if (role === "LEARNER") {
    return addLinkIfMissing(links, {
      href: "/my-courses",
      label: "My Courses",
    });
  }

  if (role === "INSTRUCTOR") {
    return addLinkIfMissing(links, { href: "/instructor", label: "Dashboard" });
  }

  if (role === "ADMIN") {
    return addLinkIfMissing(links, { href: "/admin", label: "Dashboard" });
  }

  if (role === "REVIEWER") {
    return addLinkIfMissing(links, { href: "/reviewer", label: "Dashboard" });
  }

  return links;
}

function addLinkIfMissing(links: PublicNavLink[], nextLink: PublicNavLink) {
  if (links.some((link) => link.href === nextLink.href)) {
    return links;
  }

  return [...links, nextLink];
}
