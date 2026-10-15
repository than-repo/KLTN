"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { forgotPassword } from "../api/auth-api";

const inputClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

const successMessage =
  "If this email exists, a password reset link has been sent.";

function validateEmail(email: string) {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return "Please enter a valid email address.";
  }

  return null;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const validationError = validateEmail(normalizedEmail);

    if (validationError) {
      setFormError(validationError);
      setMessage(null);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await forgotPassword({ email: normalizedEmail });
      setMessage(result.message || successMessage);
    } catch {
      setMessage(successMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-primary">Account recovery</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">
          Forgot password
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Enter your email and check your inbox for the reset link.
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

      {formError ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {message}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-pill border border-primary bg-primary px-6 text-base font-normal text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Sending link..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link className="text-primary" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
