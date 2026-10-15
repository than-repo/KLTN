import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password | E-Learning System",
  description: "Set a new password for your learning account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      description="Use the reset link from your email to create a new secure password."
      eyebrow="Password reset"
      title="Choose a new password."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
