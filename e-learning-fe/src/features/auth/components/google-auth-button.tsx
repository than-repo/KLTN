"use client";

import { useSearchParams } from "next/navigation";

import { getGoogleLoginUrl } from "../api/auth-api";

type GoogleAuthButtonProps = {
  label?: string;
};

export function GoogleAuthButton({
  label = "Continue with Google",
}: GoogleAuthButtonProps) {
  const searchParams = useSearchParams();
  const nextHref = searchParams.get("next");

  function handleClick() {
    if (nextHref?.startsWith("/") && !nextHref.startsWith("//")) {
      sessionStorage.setItem("googleAuthNextHref", nextHref);
    }
  }

  return (
    <a
      className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-pill border border-border bg-background px-6 text-base font-normal text-foreground transition-colors hover:border-primary hover:text-primary active:scale-95"
      href={getGoogleLoginUrl()}
      onClick={handleClick}
    >
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full border border-border text-sm font-semibold"
      >
        G
      </span>
      {label}
    </a>
  );
}
