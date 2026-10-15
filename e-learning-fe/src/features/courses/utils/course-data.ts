import type {
  CategoryTreeNode,
  CourseLevel,
  CourseSortField,
  PublicCourse,
  PublicCourseQuery,
  SortDirection,
} from "../types/course";

const courseLevelLabels: Record<CourseLevel, string> = {
  ADVANCE: "Advanced",
  ALL_LEVELS: "All levels",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
};

const courseLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCE", "ALL_LEVELS"];
const courseSortFields = [
  "title",
  "price",
  "level",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
];
const sortDirections = ["asc", "desc"];

export type CourseCategoryOption = {
  depth: number;
  id: string;
  name: string;
};

export type CourseCategoryGroup = {
  label: string;
  options: CourseCategoryOption[];
};

export function buildPublicCourseQueryString(query?: PublicCourseQuery) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (value instanceof Date) {
      params.set(key, value.toISOString());
      continue;
    }

    if (typeof value === "string" && value.trim() === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export function parsePublicCourseQuery(
  searchParams: Record<string, string | string[] | undefined>,
): PublicCourseQuery {
  return {
    categoryId: getStringParam(searchParams.categoryId),
    certificateEnabled: getBooleanParam(searchParams.certificateEnabled),
    language: getStringParam(searchParams.language),
    level: getCourseLevelParam(searchParams.level),
    limit: getNumberParam(searchParams.limit) ?? 12,
    maxPrice: getNumberParam(searchParams.maxPrice),
    minPrice: getNumberParam(searchParams.minPrice),
    page: getNumberParam(searchParams.page) ?? 1,
    publishedFrom: getStringParam(searchParams.publishedFrom),
    publishedTo: getStringParam(searchParams.publishedTo),
    search: getStringParam(searchParams.search),
    sortDirection: getSortDirectionParam(searchParams.sortDirection),
    sortField: getSortFieldParam(searchParams.sortField),
  };
}

export function buildCourseHref(
  pathname: string,
  currentQuery: PublicCourseQuery,
  nextQuery: PublicCourseQuery,
) {
  const queryString = buildPublicCourseQueryString({
    ...currentQuery,
    ...nextQuery,
  });

  return `${pathname}${queryString}`;
}

export function flattenCategoryTree(
  categories: CategoryTreeNode[],
  depth = 0,
): CourseCategoryOption[] {
  return categories.flatMap((category) => [
    {
      depth,
      id: category.id,
      name: category.name,
    },
    ...flattenCategoryTree(category.children, depth + 1),
  ]);
}

export function buildSelectableCategoryGroups(
  categories: CategoryTreeNode[],
): CourseCategoryGroup[] {
  return categories
    .map((category) => {
      if (category.children.length === 0) {
        return {
          label: category.name,
          options: [toCategoryOption(category, 0)],
        };
      }

      return {
        label: category.name,
        options: flattenCategoryTree(category.children, 0),
      };
    })
    .filter((group) => group.options.length > 0);
}

export function flattenCategoryGroups(
  groups: CourseCategoryGroup[],
): CourseCategoryOption[] {
  return groups.flatMap((group) => group.options);
}

function toCategoryOption(
  category: CategoryTreeNode,
  depth: number,
): CourseCategoryOption {
  return {
    depth,
    id: category.id,
    name: category.name,
  };
}

export function getCourseImageSource(course: PublicCourse) {
  if (course.thumbnailUrl) {
    return course.thumbnailUrl;
  }

  const searchableText = [
    course.title,
    course.shortDescription,
    ...(course.categories?.map((category) => category.name) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    searchableText.includes("nestjs") ||
    searchableText.includes("backend") ||
    searchableText.includes("api")
  ) {
    return "/images/nestjs.png";
  }

  if (
    searchableText.includes("nextjs") ||
    searchableText.includes("frontend") ||
    searchableText.includes("react")
  ) {
    return "/images/nextjs.png";
  }

  return "/images/AI.png";
}

export function canUseNextImage(source: string) {
  if (source.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(source);

    return url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function formatCourseLevel(level: CourseLevel) {
  return courseLevelLabels[level];
}

export function formatCourseDuration(durationInMinutes?: number | null) {
  if (durationInMinutes === undefined || durationInMinutes === null) {
    return "Self-paced";
  }

  if (durationInMinutes <= 0) {
    return "Self-paced";
  }

  if (durationInMinutes < 60) {
    return `${durationInMinutes} min`;
  }

  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

export function formatCoursePrice(price?: number | null) {
  if (price === undefined || price === null || price <= 0) {
    return "Free";
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(price)} VNĐ`;
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStringParam(value: string | string[] | undefined) {
  const firstValue = getFirstValue(value)?.trim();

  return firstValue ? firstValue : undefined;
}

function getNumberParam(value: string | string[] | undefined) {
  const firstValue = getStringParam(value);

  if (!firstValue) {
    return undefined;
  }

  const numberValue = Number(firstValue);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getBooleanParam(value: string | string[] | undefined) {
  const firstValue = getStringParam(value);

  if (firstValue === "true") {
    return true;
  }

  if (firstValue === "false") {
    return false;
  }

  return undefined;
}

function getCourseLevelParam(value: string | string[] | undefined) {
  const firstValue = getStringParam(value);

  return courseLevels.includes(firstValue ?? "")
    ? (firstValue as CourseLevel)
    : undefined;
}

function getSortFieldParam(value: string | string[] | undefined) {
  const firstValue = getStringParam(value);

  return courseSortFields.includes(firstValue ?? "")
    ? (firstValue as CourseSortField)
    : undefined;
}

function getSortDirectionParam(value: string | string[] | undefined) {
  const firstValue = getStringParam(value);

  return sortDirections.includes(firstValue ?? "")
    ? (firstValue as SortDirection)
    : undefined;
}
