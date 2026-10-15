"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GoogleAuthButton } from "./google-auth-button";
import { useAuth } from "../hooks/use-auth";

const inputClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function validateRegister(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
) {
  if (fullName.length < 2 || fullName.length > 100) {
    return "Full name must be between 2 and 100 characters.";
  }

  if (!email.trim()) {
    return "Email is required.";
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return "Please enter a valid email address.";
  }

  if (!passwordPattern.test(password)) {
    return "Password needs uppercase, lowercase, number, and special character @$!%*?&.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    const validationError = validateRegister(
      normalizedFullName,
      normalizedEmail,
      password,
      confirmPassword,
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await register({
        email: normalizedEmail,
        fullName: normalizedFullName,
        password,
      });
      router.replace("/courses");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-primary">Start learning</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">
          Create account
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Join with the fields required for the MVP auth flow.
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="fullName">
          Full name
        </label>
        <input
          autoComplete="name"
          className={inputClasses}
          id="fullName"
          name="fullName"
          onChange={(event) => setFullName(event.target.value)}
          type="text"
          value={fullName}
        />
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
          autoComplete="new-password"
          className={inputClasses}
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Use at least 8 characters with uppercase, lowercase, number, and
          special character.
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          autoComplete="new-password"
          className={inputClasses}
          id="confirmPassword"
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
      </div>

      {formError ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-pill border border-primary bg-primary px-6 text-base font-normal text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton label="Sign up with Google" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-primary" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
