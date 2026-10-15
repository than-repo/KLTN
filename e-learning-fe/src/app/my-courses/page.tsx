import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { MyCoursesContent } from "@/features/enrollments/components/my-courses-content";

export const metadata: Metadata = {
  title: "My Courses | E-Learning System",
  description: "View courses you are enrolled in.",
};

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/my-courses", label: "My Courses" },
];

export default function MyCoursesPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <RoleProtectedRoute allowedRoles={["LEARNER"]} fallbackHref="/courses">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Learner dashboard
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
              My Courses
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Keep track of your active enrollments and return to course details
              whenever you are ready to continue.
            </p>
          </div>
          <Suspense fallback={<MyCoursesLoading />}>
            <MyCoursesContent />
          </Suspense>
        </section>
      </RoleProtectedRoute>
    </main>
  );
}

function MyCoursesLoading() {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-14 text-center text-muted-foreground">
      Loading your courses...
    </div>
  );
}
