import Link from "next/link";

import type { CourseInstructorSummary } from "../types/course";

type InstructorLinksProps = {
  className?: string;
  instructors: CourseInstructorSummary[];
  onDark?: boolean;
};

export function InstructorLinks({
  className,
  instructors,
  onDark = false,
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
        <span key={instructor.id}>
          {index > 0 ? ", " : null}
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
