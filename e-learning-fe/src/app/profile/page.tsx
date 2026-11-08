import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { EditProfileForm } from "@/features/users/components/edit-profile-form";

export const metadata: Metadata = {
  title: "Edit Profile | E-Learning System",
  description: "Update your personal information and profile photo.",
};

const navLinks = [{ href: "/courses", label: "Courses" }];

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />

      <ProtectedRoute>
        <section className="mx-auto w-full max-w-[900px] px-5 py-10 sm:px-8 lg:py-14">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Your account
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
              Edit profile
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Update your personal information and the profile photo shown to
              other members.
            </p>
          </div>

          <EditProfileForm />
        </section>
      </ProtectedRoute>
    </main>
  );
}
