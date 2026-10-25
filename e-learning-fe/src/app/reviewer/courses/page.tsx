import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { ReviewerTasksContent } from "@/features/reviewer/components/reviewer-tasks-content";
import { reviewerNavLinks } from "@/features/reviewer/utils/reviewer-nav";

export const metadata: Metadata = {
  title: "My Review Tasks | E-Learning System",
  description: "Review courses assigned to you.",
};

export default function ReviewerMyTasksPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={reviewerNavLinks} />
      <RoleProtectedRoute allowedRoles={["REVIEWER"]} fallbackHref="/">
        <ReviewerTasksContent />
      </RoleProtectedRoute>
    </main>
  );
}
