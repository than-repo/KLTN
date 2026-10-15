"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { resetPassword } from "../api/auth-api";

const inputClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function validatePassword(password: string, confirmPassword: string) {
  if (!passwordPattern.test(password)) {
    return "Password needs uppercase, lowercase, number, and special character @$!%*?&.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setFormError("Reset link is missing or invalid.");
      return;
    }

    const validationError = validatePassword(newPassword, confirmPassword);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await resetPassword({ newPassword, token });
      setSuccessMessage(result.message || "Password has been reset successfully.");
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to reset password. Please request a new link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-primary">Set new password</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight">
          Reset password
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Choose a new password for your account.
        </p>
      </div>

      {!token ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          Reset link is missing or invalid.
        </p>
      ) : null}

      <div>
        <label className="text-sm font-semibold" htmlFor="newPassword">
          New password
        </label>
        <input
          autoComplete="new-password"
          className={inputClasses}
          id="newPassword"
          name="newPassword"
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          value={newPassword}
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

      {successMessage ? (
        <p className="rounded-md border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
          {successMessage}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-pill border border-primary bg-primary px-6 text-base font-normal text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || !token}
        type="submit"
      >
        {isSubmitting ? "Resetting password..." : "Reset password"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Need a new link?{" "}
        <Link className="text-primary" href="/forgot-password">
          Request reset
        </Link>
      </p>
    </form>
  );
}
