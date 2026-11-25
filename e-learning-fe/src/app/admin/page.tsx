import type { Metadata } from "next";

import { AdminDashboardClient } from "./admin-dashboard-client";
import { adminNavLinks } from "@/features/admin/utils/admin-nav";

export const metadata: Metadata = {
  title: "Admin Dashboard | E-Learning System",
  description: "Manage users, categories, and reviewer authorizations.",
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient navLinks={adminNavLinks} />;
}