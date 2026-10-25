import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { ReviewerAvailableContent } from "@/features/reviewer/components/reviewer-available-content";
import { reviewerNavLinks } from "@/features/reviewer/utils/reviewer-nav";

export const metadata: Metadata = {
  title: "Available Courses | E-Learning System",
  description: "Claim courses submitted for review.",
};

export default function ReviewerAvailableCoursesPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={reviewerNavLinks} />
      <RoleProtectedRoute allowedRoles={["REVIEWER"]} fallbackHref="/">
        <ReviewerAvailableContent />
      </RoleProtectedRoute>
    </main>
  );
}
