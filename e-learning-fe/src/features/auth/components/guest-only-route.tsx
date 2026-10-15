"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "../hooks/use-auth";

type GuestOnlyRouteProps = {
  children: ReactNode;
  fallbackHref?: string;
};

export function GuestOnlyRoute({
  children,
  fallbackHref = "/courses",
}: GuestOnlyRouteProps) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, router, status]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-muted-foreground">
        Checking your session...
      </div>
    );
  }

  return children;
}
