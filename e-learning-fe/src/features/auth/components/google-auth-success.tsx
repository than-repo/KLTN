"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "../hooks/use-auth";

export function GoogleAuthSuccess() {
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    let isMounted = true;

    refresh()
      .then((isAuthenticated) => {
        if (!isMounted) {
          return;
        }

        router.replace(
          isAuthenticated
            ? consumeGoogleAuthNextHref()
            : "/login?error=google-auth-failed",
        );
      })
      .catch(() => {
        if (isMounted) {
          router.replace("/login?error=google-auth-failed");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refresh, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-muted-foreground">
      Completing Google sign in...
    </main>
  );
}

function consumeGoogleAuthNextHref() {
  const nextHref = sessionStorage.getItem("googleAuthNextHref");
  sessionStorage.removeItem("googleAuthNextHref");

  if (nextHref?.startsWith("/") && !nextHref.startsWith("//")) {
    return nextHref;
  }

  return "/courses";
}
