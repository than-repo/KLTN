import type { Metadata } from "next";

import { InstructorDashboardClient } from "./instructor-dashboard-client";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Instructor Dashboard | E-Learning System",
  description: "Manage your courses and build learning content.",
};

export default function InstructorDashboardPage() {
  return <InstructorDashboardClient navLinks={instructorNavLinks} />;
}