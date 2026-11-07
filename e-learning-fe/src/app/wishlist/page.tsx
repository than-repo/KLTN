import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { FooterSection } from "@/app/_components/sections/footer-section";
import { footerContent } from "@/app/_components/home-content";
import { WishlistPageContent } from "@/features/wishlist/components/wishlist-page-content";

export const metadata: Metadata = {
  title: "Wishlist | E-Learning System",
  description: "View and manage the courses you saved to your wishlist.",
};

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/wishlist", label: "Wishlist" },
];

export default function WishlistPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <WishlistPageContent />
      <FooterSection
        brand={footerContent.brand}
        demoNote={footerContent.demoNote}
        groups={footerContent.groups}
        notice={footerContent.notice}
      />
    </main>
  );
}
