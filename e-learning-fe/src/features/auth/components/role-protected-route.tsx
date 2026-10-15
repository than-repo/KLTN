"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { UserRole } from "../types/auth";
import { useAuth } from "../hooks/use-auth";

type RoleProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallbackHref?: string;
};

export function RoleProtectedRoute({
  allowedRoles,
  children,
  fallbackHref = "/",
}: RoleProtectedRouteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useAuth();
  const isAllowed = user ? allowedRoles.includes(user.role) : false;

  useEffect(() => {
    if (status === "guest") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (status === "authenticated" && !isAllowed) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, isAllowed, pathname, router, status]);

  if (status !== "authenticated" || !isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-muted-foreground">
        Checking your access...
      </div>
    );
  }

  return children;
}
