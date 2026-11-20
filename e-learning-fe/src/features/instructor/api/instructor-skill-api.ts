import { apiRequest } from "@/lib/api/client";

import type {
  CreateSkillPayload,
  Skill,
  SuggestSkillResult,
  SuggestSkillVariables,
} from "../types/instructor-skill";

export function suggestInstructorCourseSkills(
  courseId: string,
  variables: SuggestSkillVariables,
  accessToken: string,
) {
  const { keywords, ...rest } = variables;
  const body: {
    keywords: string[];
    description?: string;
    limit?: number;
  } = { keywords };

  if (rest.description !== undefined && rest.description !== null) {
    body.description = rest.description;
  }

  if (rest.limit !== undefined) {
    body.limit = rest.limit;
  }

  return apiRequest<SuggestSkillResult[]>(
    `/skill/course/${courseId}/suggestions`,
    { accessToken, body, method: "POST" },
  );
}

export function createInstructorSkill(
  payload: CreateSkillPayload,
  accessToken: string,
) {
  return apiRequest<Skill>(
    "/skill",
    { accessToken, body: payload, method: "POST" },
  );
}

export function getInstructorCourseSkills(
  courseId: string,
  accessToken: string,
) {
  return apiRequest<Skill[]>(
    `/skill/course/${courseId}`,
    { accessToken, method: "GET" },
  );
}

export function updateInstructorSkill(
  payload: CreateSkillPayload,
  skillId: string,
  accessToken: string,
) {
  return apiRequest<Skill>(
    `/skill/course/${payload.courseId}/skill/${skillId}`,
    { accessToken, body: payload, method: "PATCH" },
  );
}

export function deleteInstructorSkill(
  courseId: string,
  skillId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/skill/course/${courseId}/skill/${skillId}`,
    { accessToken, method: "DELETE" },
  );
}

export function attachInstructorSkillToLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  skillId: string,
  accessToken: string,
) {
  return apiRequest<Skill>(
    `/skill/course/${courseId}/sections/${sectionId}/lessons/${lessonId}/skills/${skillId}/skill-attachment`,
    { accessToken, method: "POST" },
  );
}

export function detachInstructorSkillFromLesson(
  courseId: string,
  sectionId: string,
  lessonId: string,
  skillId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/skill/course/${courseId}/sections/${sectionId}/lessons/${lessonId}/skills/${skillId}/skill-attachment`,
    { accessToken, method: "DELETE" },
  );
}

export function getInstructorLessonSkills(
  courseId: string,
  sectionId: string,
  lessonId: string,
  accessToken: string,
) {
  return apiRequest<Skill[]>(
    `/skill/course/${courseId}/sections/${sectionId}/lessons/${lessonId}/skills`,
    { accessToken, method: "GET" },
  );
}