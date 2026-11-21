"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, BookOpen, Settings, FileText, Eye, ArrowLeft } from "lucide-react";

export type InstructorCourseTab =
  | "curriculum"
  | "skills"
  | "settings"
  | "assessments"
  | "preview";

interface InstructorCourseTabsProps {
  courseId: string;
  currentTab: InstructorCourseTab;
  skillsCount?: number;
  assessmentsCount?: number;
}

const tabConfig: Record<
  InstructorCourseTab,
  { label: string; icon: React.ComponentType<{ className?: string }>; href: (courseId: string) => string; showBadge?: boolean }
> = {
  curriculum: {
    label: "Curriculum",
    icon: BookOpen,
    href: (courseId) => `/instructor/courses/${courseId}/curriculum`,
  },
  skills: {
    label: "Skills",
    icon: FileText,
    href: (courseId) => `/instructor/courses/${courseId}/skills`,
    showBadge: true,
  },
  settings: {
    label: "Settings",
    icon: Settings,
    href: (courseId) => `/instructor/courses/${courseId}/edit`,
  },
  assessments: {
    label: "Assessments",
    icon: FileText,
    href: (courseId) => `/instructor/courses/${courseId}/assessments`,
    showBadge: true,
  },
  preview: {
    label: "Preview",
    icon: Eye,
    href: (courseId) => `/instructor/courses/${courseId}/preview`,
  },
};

const defaultTabOrder: InstructorCourseTab[] = [
  "curriculum",
  "skills",
  "settings",
  "assessments",
  "preview",
];

export function InstructorCourseTabs({
  courseId,
  currentTab,
  skillsCount = 0,
  assessmentsCount = 0,
}: InstructorCourseTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Course management tabs" className="w-full">
      <div className="flex items-center gap-2 bg-surface-pearl rounded-xl border border-border p-1">
        {defaultTabOrder.map((tabKey) => {
          const config = tabConfig[tabKey];
          const isActive = currentTab === tabKey;
          const href = config.href(courseId);
          const Icon = config.icon;

          return (
            <Link
              key={tabKey}
              href={href}
              className={[
                "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-ink-muted hover:text-foreground hover:bg-white/50",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
              {config.label}
              {config.showBadge && tabKey === "skills" && skillsCount > 0 && (
                <Badge className="flex-shrink-0 min-w-[20px] h-5 text-xs" variant={isActive ? "action" : "action"}>
                  {skillsCount}
                </Badge>
              )}
              {config.showBadge && tabKey === "assessments" && assessmentsCount > 0 && (
                <Badge className="flex-shrink-0 min-w-[20px] h-5 text-xs" variant={isActive ? "action" : "action"}>
                  {assessmentsCount}
                </Badge>
              )}
            </Link>
          );
        })}
        <Link
          href="/instructor/courses"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-ink-muted hover:text-foreground hover:bg-white/50 transition-all duration-200 ml-auto border border-border bg-card"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          My Courses
        </Link>
      </div>
    </nav>
  );
}