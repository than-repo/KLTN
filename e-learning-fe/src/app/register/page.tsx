import type { Metadata } from "next";

import { AuthPageShell } from "@/features/auth/components/auth-page-shell";
import { GuestOnlyRoute } from "@/features/auth/components/guest-only-route";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Register | E-Learning System",
  description: "Create an account to start learning.",
};

export default function RegisterPage() {
  return (
    <GuestOnlyRoute>
      <AuthPageShell
        description="Create a learner profile, prepare your course catalog, and step into the platform with a simple account."
        eyebrow="New account"
        title="Start with a clean learning profile."
      >
        <RegisterForm />
      </AuthPageShell>
    </GuestOnlyRoute>
  );
}
