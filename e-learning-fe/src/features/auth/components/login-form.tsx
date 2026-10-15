"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GoogleAuthButton } from "./google-auth-button";
import { useAuth } from "../hooks/use-auth";

const inputClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

function getSafeNextHref() {
  const nextHref = new URLSearchParams(window.location.search).get("next");

  if (nextHref?.startsWith("/") && !nextHref.startsWith("//")) {
    return nextHref;
  }

  return "/courses";
}

function validateLogin(email: string, password: string): string | null {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return "Please enter a valid email address.";
  }

  if (!password.trim()) {
    return "Password is required.";
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    return "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&).";
  }

  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const googleError =
    searchParams.get("error") === "google-auth-failed"
      ? "Google sign in failed. Please try again."
      : null;
  const visibleError = formError ?? googleError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const validationError = validateLogin(normalizedEmail, password);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({ email: normalizedEmail, password });
      router.replace(getSafeNextHref());
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-primary">Welcome back</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">Sign in</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Continue with your learning workspace.
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={inputClasses}
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className={inputClasses}
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <div className="mt-2 flex justify-end">
          <Link className="text-sm text-primary" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </div>

      {visibleError ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {visibleError}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-pill border border-primary bg-primary px-6 text-base font-normal text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton />

      <p className="text-center text-sm text-muted-foreground">
        New to the platform?{" "}
        <Link className="text-primary" href="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
