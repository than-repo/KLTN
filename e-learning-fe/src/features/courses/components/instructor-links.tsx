import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import type { CourseInstructorSummary } from "../types/course";

type InstructorLinksProps = {
  className?: string;
  instructors: (CourseInstructorSummary & { avatarUrl?: string | null })[];
  onDark?: boolean;
  showAvatar?: boolean;
  avatarSize?: "sm" | "md" | "lg" | "xl";
};

export function InstructorLinks({
  className,
  instructors,
  onDark = false,
  showAvatar = false,
  avatarSize = "sm",
}: InstructorLinksProps) {
  if (instructors.length === 0) {
    return <span className={className}>Not assigned</span>;
  }

  const linkClassName = onDark
    ? "font-semibold text-primary-on-dark underline-offset-4 hover:underline"
    : "font-semibold text-primary underline-offset-4 hover:underline";

  return (
    <span className={className}>
      {instructors.map((instructor, index) => (
        <span key={instructor.id} className="flex items-center gap-1">
          {index > 0 ? ", " : null}
          {showAvatar && instructor.avatarUrl && (
            <Avatar
              src={instructor.avatarUrl}
              alt={`${instructor.fullName}'s profile picture`}
              fallback={instructor.fullName}
              size={avatarSize}
            />
          )}
          <Link
            className={linkClassName}
            href={`/users/${encodeURIComponent(instructor.id)}`}
          >
            {instructor.fullName}
          </Link>
        </span>
      ))}
    </span>
  );
}
