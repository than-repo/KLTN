import type { Metadata } from "next";

import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { GuestOnlyRoute } from "@/features/auth/components/guest-only-route";

export const metadata: Metadata = {
  title: "Forgot Password | E-Learning System",
  description: "Request a password reset link for your learning account.",
};

export default function ForgotPasswordPage() {
  return (
    <GuestOnlyRoute>
      <AuthPageShell
        description="Recover access securely and return to your courses with a fresh password."
        eyebrow="Password help"
        title="Get a reset link for your account."
      >
        <ForgotPasswordForm />
      </AuthPageShell>
    </GuestOnlyRoute>
  );
}
