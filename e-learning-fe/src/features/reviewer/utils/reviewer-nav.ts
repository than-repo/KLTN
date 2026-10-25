import type { PublicNavLink } from "@/components/layout/public-navbar/nav-link";

export const reviewerNavLinks: PublicNavLink[] = [
  { href: "/reviewer", label: "Dashboard" },
  { href: "/reviewer/courses", label: "My Review Tasks" },
  { href: "/reviewer/courses/available", label: "Available Courses" },
  { href: "/courses", label: "Catalog" },
];
