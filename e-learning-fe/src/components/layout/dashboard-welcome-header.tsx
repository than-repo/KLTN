"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";

type DashboardRole = "INSTRUCTOR" | "REVIEWER" | "ADMIN";

type DashboardWelcomeHeaderProps = {
  role: DashboardRole;
  userName: string | null | undefined;
  userRole: DashboardRole;
  subtitle?: string;
  actions?: React.ReactNode;
};

const roleSubtitles: Record<DashboardRole, string> = {
  INSTRUCTOR:
    "Manage your courses, build curriculum, and prepare assessments for review.",
  REVIEWER:
    "Review submitted courses and make decisions. Claim new courses matching your categories.",
  ADMIN:
    "Manage platform users, organize categories, and control reviewer authorizations.",
};

const roleLabels: Record<DashboardRole, string> = {
  INSTRUCTOR: "Instructor",
  REVIEWER: "Reviewer",
  ADMIN: "Admin",
};

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(userName: string | null | undefined): string {
  if (!userName) return "there";
  const parts = userName.trim().split(/\s+/);
  return parts[0] || "there";
}

export function DashboardWelcomeHeader({
  role,
  userName,
  userRole,
  subtitle,
  actions,
}: DashboardWelcomeHeaderProps) {
  const [greeting, setGreeting] = useState(getTimeOfDayGreeting());
  const [displayName, setDisplayName] = useState(getDisplayName(userName));

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting());
    setDisplayName(getDisplayName(userName));
  }, [userName]);

  // Update greeting based on time changes (check every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeOfDayGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const resolvedSubtitle = subtitle ?? roleSubtitles[role];

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {roleLabels[role]} workspace
            <Badge variant="action" className="ml-2">
              {roleLabels[userRole]}
            </Badge>
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {greeting}, {displayName}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {resolvedSubtitle}
          </p>
        </div>
        {actions && (
          <div className="mt-4 shrink-0 sm:mt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}