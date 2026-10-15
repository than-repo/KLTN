import type { CourseLearningResponse } from "../types/learning-course";

export const mockCourseLearning = {
  id: "1b42ea6e-8368-4bb1-97cd-7734a35091fd",
  sections: [
    {
      description:
        "Set up the mental model for the course and confirm the local backend workflow.",
      id: "61cc6d2a-3417-47af-a78f-a9f455cf9339",
      lessons: [
        {
          description:
            "Understand the course project, folder boundaries, and expected API behavior.",
          files: [
            {
              id: "07cf53c6-06d1-460e-84dc-7f7a8fc291e8",
              type: "VIDEO",
              url: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
            },
          ],
          id: "e0d69330-2344-41f7-8bf6-a3ca1c547d33",
          lessonIndex: 0,
          title: "Welcome and project map",
        },
      ],
      sectionIndex: 0,
      title: "Start here",
    },
  ],
  shortDescription:
    "Learn how to expose course sections, lessons, and media safely for enrolled learners.",
  slug: "nestjs-clean-api",
  thumbnailUrl: null,
  title: "NestJS Clean API for E-Learning",
} satisfies CourseLearningResponse;
