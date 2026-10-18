import type { CourseLevel, InstructorCourse } from "../types/instructor-course";

const EDITABLE_COURSE_STATUSES = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "REJECTED",
  "NEEDS_CHANGES",
  "NEEDS_REVISION",
  "REVISION_REQUIRED",
];

const SUBMITTABLE_COURSE_STATUSES = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "REJECTED",
  "NEEDS_CHANGES",
  "NEEDS_REVISION",
  "REVISION_REQUIRED",
];

const LOCKED_SUBMIT_STATUSES = [
  "PENDING_REVIEW",
  "SUBMITTED_FOR_REVIEW",
  "IN_REVIEW",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
];

const WARNING_REVIEW_STATUSES = [
  "CHANGES_REQUESTED",
  "REJECTED",
  "NEEDS_REVISION",
  "REVISION_REQUIRED",
];

export function normalizeCourseStatus(status?: string | null) {
  return String(status || "").toUpperCase();
}

export function isCourseEditable(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status);

  return (
    !normalizedStatus || EDITABLE_COURSE_STATUSES.includes(normalizedStatus)
  );
}

export function isDraftCourseStatus(status?: string | null) {
  return normalizeCourseStatus(status) === "DRAFT";
}

export function canSubmitCourse(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status);

  if (!normalizedStatus) return true;

  return SUBMITTABLE_COURSE_STATUSES.includes(normalizedStatus);
}

export function shouldHighlightReview(course: InstructorCourse) {
  return WARNING_REVIEW_STATUSES.includes(normalizeCourseStatus(course.status));
}

export function canDeleteCourse(course: InstructorCourse) {
  return normalizeCourseStatus(course.status) === "DRAFT";
}

export function getLockedCourseMessage(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status) || "UNKNOWN";

  if (
    normalizedStatus === "PENDING_REVIEW" ||
    normalizedStatus === "SUBMITTED_FOR_REVIEW"
  ) {
    return "This course is under review. You cannot edit course information until the review is finished.";
  }

  if (normalizedStatus === "APPROVED" || normalizedStatus === "PUBLISHED") {
    return "This course has already been approved or published. Direct editing is locked.";
  }

  return `This course cannot be edited in the current status: ${normalizedStatus}.`;
}

export function getSubmitLockedMessage(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status);

  if (
    normalizedStatus === "PENDING_REVIEW" ||
    normalizedStatus === "SUBMITTED_FOR_REVIEW" ||
    normalizedStatus === "IN_REVIEW" ||
    normalizedStatus === "UNDER_REVIEW"
  ) {
    return "This course is already under review. You cannot submit it again.";
  }

  if (normalizedStatus === "APPROVED" || normalizedStatus === "PUBLISHED") {
    return "This course has already been approved or published. You cannot submit it again.";
  }

  if (LOCKED_SUBMIT_STATUSES.includes(normalizedStatus)) {
    return "This course cannot be submitted in its current status.";
  }

  if (
    normalizedStatus &&
    !SUBMITTABLE_COURSE_STATUSES.includes(normalizedStatus)
  ) {
    return `This course cannot be submitted in its current status: ${normalizedStatus}.`;
  }

  return "";
}

export function getDeleteDisabledReason(course: InstructorCourse) {
  const status = normalizeCourseStatus(course.status);

  if (status === "DRAFT") {
    return "";
  }

  if (!status) {
    return "Only draft courses can be deleted.";
  }

  return `Only draft courses can be deleted. Current status: ${status}.`;
}

export function formatLevelLabel(level: CourseLevel) {
  const labels: Record<CourseLevel, string> = {
    ADVANCE: "Advanced",
    ALL_LEVELS: "All Levels",
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
  };

  return labels[level] || level;
}

export function formatCourseStatusLabel(status?: string | null) {
  const normalizedStatus = normalizeCourseStatus(status);

  if (!normalizedStatus) return "Unknown";

  return normalizedStatus
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type CourseStatusBadgeVariant =
  | "action"
  | "danger"
  | "warning"
  | "neutral";

export function getCourseStatusBadgeVariant(
  status?: string | null,
): CourseStatusBadgeVariant {
  const normalizedStatus = normalizeCourseStatus(status);

  if (normalizedStatus === "APPROVED" || normalizedStatus === "PUBLISHED") {
    return "action";
  }

  if (
    normalizedStatus === "REJECTED" ||
    normalizedStatus === "CHANGES_REQUESTED"
  ) {
    return "danger";
  }

  if (
    normalizedStatus === "PENDING_REVIEW" ||
    normalizedStatus === "SUBMITTED_FOR_REVIEW" ||
    normalizedStatus === "IN_REVIEW" ||
    normalizedStatus === "UNDER_REVIEW"
  ) {
    return "warning";
  }

  return "neutral";
}
