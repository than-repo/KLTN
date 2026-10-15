import type { PublicNavLink } from "@/components/layout/public-navbar/nav-link";

export type HomeAction = {
  href: string;
  label: string;
};

export type HomeHeroImage = {
  alt: string;
  height: number;
  src: string;
  width: number;
};

export type HomeStat = {
  label: string;
  value: string;
};

export type HomeValueCard = {
  description: string;
  eyebrow: string;
  title: string;
};

export type HomeFooterLink = {
  href: string;
  label: string;
};

export type HomeFooterGroup = {
  links: HomeFooterLink[];
  title: string;
};

export const brandLabel = "E-Learning System";

export const navLinks: PublicNavLink[] = [
  { href: "/courses", label: "Courses" },
];

export const heroContent = {
  eyebrow: "Ucademy-style learning marketplace",
  title: "Learn the skills that move your career forward.",
  description:
    "Explore practical courses, find focused learning paths, and start building real project skills from one clear catalog.",
  primaryAction: { href: "#featured-courses", label: "Explore courses" },
  secondaryAction: { href: "/register", label: "Create account" },
  searchPlaceholder: "What do you want to learn?",
  image: {
    alt: "Learning platform dashboard shown on a laptop and tablet",
    height: 1024,
    src: "/images/home-learning-workspace.png",
    width: 1536,
  },
};

export const benefits = [
  "Fresh course catalog",
  "Beginner to advanced",
  "Project-focused paths",
  "Certificate-ready learning",
];

export const stats: HomeStat[] = [
  { label: "Learning categories", value: "20+" },
  { label: "Practical course paths", value: "120+" },
  { label: "Platform roles supported", value: "3" },
];

export const learnerOutcomes: HomeValueCard[] = [
  {
    eyebrow: "For learners",
    title: "Find the right next lesson faster",
    description:
      "Search by topic, compare course details, and continue into structured lessons without extra navigation noise.",
  },
  {
    eyebrow: "For instructors",
    title: "Package skills into focused courses",
    description:
      "Organize sections, lessons, files, and course information around a clear publishing workflow.",
  },
  {
    eyebrow: "For teams",
    title: "Keep review and enrollment controlled",
    description:
      "Support admins, reviewers, learners, and instructors with role-aware platform surfaces.",
  },
];

export const trustCards: HomeValueCard[] = [
  {
    eyebrow: "Catalog",
    title: "Real published courses",
    description:
      "The homepage uses the same public course data as the catalog, so featured learning stays connected to the platform.",
  },
  {
    eyebrow: "Discovery",
    title: "Search-first browsing",
    description:
      "A focused search bar and category links send learners directly into filtered course results.",
  },
  {
    eyebrow: "Growth",
    title: "Ready for richer learning flows",
    description:
      "The layout leaves room for reviews, ratings, progress, and recommendations as those features mature.",
  },
];

export const finalCta = {
  title: "Start learning from the course catalog today.",
  description:
    "Create an account to prepare for enrollment flows, or browse published courses before you sign in.",
  primaryAction: { href: "/register", label: "Create account" },
  secondaryAction: { href: "/courses", label: "Browse courses" },
};

export const footerContent = {
  brand: brandLabel,
  demoNote: "Demo for learning",
  notice: "Demo learning platform for course marketplace practice.",
  groups: [
    {
      title: "Explore",
      links: [
        { href: "/courses", label: "Courses" },
        { href: "/my-courses", label: "My Courses" },
        { href: "/register", label: "Register" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/login", label: "Login" },
        { href: "/profile", label: "Edit profile" },
        { href: "/forgot-password", label: "Forgot password" },
      ],
    },
    {
      title: "Learning demo",
      links: [
        { href: "#", label: "Categories" },
        { href: "#", label: "Instructors" },
        { href: "#", label: "Certificates" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "#", label: "Help center" },
        { href: "#", label: "Terms" },
        { href: "#", label: "Privacy" },
      ],
    },
  ],
} satisfies {
  brand: string;
  demoNote: string;
  groups: HomeFooterGroup[];
  notice: string;
};
