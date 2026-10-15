import type { Metadata } from "next";

import { GoogleAuthSuccess } from "@/features/auth/components/google-auth-success";

export const metadata: Metadata = {
  title: "Google Sign In | E-Learning System",
  description: "Completing Google sign in.",
};

export default function GoogleAuthSuccessPage() {
  return <GoogleAuthSuccess />;
}
