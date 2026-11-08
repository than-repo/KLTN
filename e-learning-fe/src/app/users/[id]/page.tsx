import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { footerContent } from "@/app/_components/home-content";
import { FooterSection } from "@/app/_components/sections/footer-section";
import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { getPublicUserProfile } from "@/features/users/api/public-user-api";
import { PublicUserProfileView } from "@/features/users/components/public-user-profile";
import { ApiError } from "@/lib/api/client";

type PublicUserPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Public Profile | E-Learning System",
  description: "View a member's public profile.",
};

const navLinks = [{ href: "/courses", label: "Courses" }];

export default async function PublicUserPage({ params }: PublicUserPageProps) {
  const { id } = await params;
  const profile = await getProfileOrNotFound(id);

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <section className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-focus"
          href="/courses"
        >
          <span aria-hidden="true">←</span>
          Browse courses
        </Link>
        <PublicUserProfileView profile={profile} />
      </section>
      <FooterSection
        brand={footerContent.brand}
        demoNote={footerContent.demoNote}
        groups={footerContent.groups}
        notice={footerContent.notice}
      />
    </main>
  );
}

async function getProfileOrNotFound(id: string) {
  try {
    return await getPublicUserProfile(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.statusCode === 400 || error.statusCode === 404)
    ) {
      notFound();
    }

    throw error;
  }
}
