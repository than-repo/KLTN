import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { ReviewerWorkspaceContent } from "@/features/reviewer/components/reviewer-workspace-content";
import { reviewerNavLinks } from "@/features/reviewer/utils/reviewer-nav";

export const metadata: Metadata = {
  title: "Review Workspace | E-Learning System",
  description: "Review course content and submit your decision.",
};

export default function ReviewerWorkspacePage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={reviewerNavLinks} />
      <RoleProtectedRoute allowedRoles={["REVIEWER"]} fallbackHref="/">
        <ReviewerWorkspaceContent />
      </RoleProtectedRoute>
    </main>
  );
}
