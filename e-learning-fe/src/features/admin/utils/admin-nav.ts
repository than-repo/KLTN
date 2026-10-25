import type { PublicNavLink } from "@/components/layout/public-navbar/nav-link";

export const adminNavLinks: PublicNavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/reviewer-categories", label: "Reviewers" },
  { href: "/courses", label: "Catalog" },
];
