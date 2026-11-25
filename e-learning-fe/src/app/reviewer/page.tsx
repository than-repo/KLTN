import type { Metadata } from "next";

import { ReviewerDashboardClient } from "./reviewer-dashboard-client";
import { reviewerNavLinks } from "@/features/reviewer/utils/reviewer-nav";

export const metadata: Metadata = {
  title: "Reviewer Dashboard | E-Learning System",
  description: "Review submitted courses and make review decisions.",
};

export default function ReviewerDashboardPage() {
  return <ReviewerDashboardClient navLinks={reviewerNavLinks} />;
}