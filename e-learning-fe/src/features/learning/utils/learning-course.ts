import type {
  LearningFile,
  LearningLesson,
  LearningMediaType,
  LearningSection,
} from "../types/learning-course";

export type LessonBundle = {
  lesson: LearningLesson;
  lessonNumber: number;
  section: LearningSection;
  sectionNumber: number;
};

export type LearningTotals = {
  fileCount: number;
  lessonCount: number;
  sectionCount: number;
};

export const mediaTypeLabels: Record<LearningMediaType, string> = {
  AUDIO: "Audio",
  DOCUMENT: "Document",
  IMAGE: "Image",
  OTHER: "File",
  VIDEO: "Video",
};

export const mediaTypeMarks: Record<LearningMediaType, string> = {
  AUDIO: "A",
  DOCUMENT: "D",
  IMAGE: "I",
  OTHER: "F",
  VIDEO: "V",
};

export const mediaTypeClasses: Record<LearningMediaType, string> = {
  AUDIO: "border-[#7c3aed] bg-[#f4f0ff] text-[#3b0764]",
  DOCUMENT: "border-[#2563eb] bg-[#eff6ff] text-[#1e3a8a]",
  IMAGE: "border-[#16a34a] bg-[#effaf4] text-[#14532d]",
  OTHER: "border-[#52525b] bg-[#f4f4f5] text-[#27272a]",
  VIDEO: "border-[#ea580c] bg-[#fff7ed] text-[#7c2d12]",
};

export function getOrderedSections(sections: LearningSection[]) {
  return [...sections].sort(
    (first, second) => first.sectionIndex - second.sectionIndex,
  );
}

export function getOrderedLessons(lessons: LearningLesson[]) {
  return [...lessons].sort(
    (first, second) => first.lessonIndex - second.lessonIndex,
  );
}

export function flattenLessons(sections: LearningSection[]): LessonBundle[] {
  return getOrderedSections(sections).flatMap((section, sectionPosition) =>
    getOrderedLessons(section.lessons).map((lesson, lessonPosition) => ({
      lesson,
      lessonNumber: lessonPosition + 1,
      section,
      sectionNumber: sectionPosition + 1,
    })),
  );
}

export function getLearningTotals(sections: LearningSection[]): LearningTotals {
  const orderedSections = getOrderedSections(sections);

  return orderedSections.reduce(
    (totals, section) => {
      const sectionLessonCount = section.lessons.length;
      const sectionFileCount = section.lessons.reduce(
        (fileTotal, lesson) => fileTotal + lesson.files.length,
        0,
      );

      return {
        fileCount: totals.fileCount + sectionFileCount,
        lessonCount: totals.lessonCount + sectionLessonCount,
        sectionCount: totals.sectionCount,
      };
    },
    {
      fileCount: 0,
      lessonCount: 0,
      sectionCount: orderedSections.length,
    },
  );
}

export function getLessonSelection(
  sections: LearningSection[],
  requestedLessonId?: string,
) {
  const lessons = flattenLessons(sections);
  const requestedBundle = requestedLessonId
    ? lessons.find(({ lesson }) => lesson.id === requestedLessonId)
    : undefined;
  const firstBundle = lessons[0] ?? null;
  const activeBundle = requestedLessonId
    ? (requestedBundle ?? null)
    : firstBundle;
  const activeIndex = activeBundle
    ? lessons.findIndex(({ lesson }) => lesson.id === activeBundle.lesson.id)
    : -1;

  return {
    activeBundle,
    firstBundle,
    isRequestedLessonMissing: Boolean(requestedLessonId && !requestedBundle),
    lessons,
    nextBundle:
      activeIndex >= 0 && activeIndex < lessons.length - 1
        ? lessons[activeIndex + 1]
        : null,
    previousBundle: activeIndex > 0 ? lessons[activeIndex - 1] : null,
  };
}

export function pickPrimaryFile(files: LearningFile[]) {
  return (
    files.find((file) => file.type === "VIDEO") ??
    files.find((file) => file.type === "AUDIO") ??
    files.find((file) => file.type === "IMAGE") ??
    files[0] ??
    null
  );
}
