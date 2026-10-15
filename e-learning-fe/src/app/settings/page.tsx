import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export const metadata: Metadata = {
  title: "Account Settings | E-Learning System",
  description: "Manage your account settings, security, and appearance.",
};

const navLinks = [{ href: "/courses", label: "Courses" }];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-muted text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />

      <ProtectedRoute>
        <section className="mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8 lg:py-14">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Account settings
          </h1>

          <div className="mt-8">
            <SettingsTabs />
          </div>
        </section>
      </ProtectedRoute>
    </main>
  );
}
