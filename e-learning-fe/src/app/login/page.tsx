import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { GuestOnlyRoute } from "@/features/auth/components/guest-only-route";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Login | E-Learning System",
  description: "Sign in to continue learning.",
};

export default function LoginPage() {
  return (
    <GuestOnlyRoute>
      <AuthPageShell
        description="Return to your courses, continue lessons, and keep progress moving with a secure session."
        eyebrow="Secure access"
        title="Welcome back to your learning space."
      >
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthPageShell>
    </GuestOnlyRoute>
  );
}
