"use client";
import { useCallback, useEffect, useState } from "react";
import { getLearnerCourseAssessments } from "../api/assessment-api";
import type {
  LearnerCourseAssessmentItem,
  LearnerCourseAssessments,
} from "../types/assessment";
type UseLearnerCourseAssessmentsArgs = {
  accessToken?: string | null;
  courseId?: string | null;
  enabled?: boolean;
};
function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
export function useLearnerCourseAssessments({
  accessToken,
  courseId,
  enabled = true,
}: UseLearnerCourseAssessmentsArgs) {
  const [data, setData] = useState<LearnerCourseAssessments | null>(null);
  const [assessments, setAssessments] = useState<LearnerCourseAssessmentItem[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const canFetch = Boolean(enabled && accessToken && courseId);
  const load = useCallback(async () => {
    if (!canFetch || !accessToken || !courseId) {
      setData(null);
      setAssessments([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getLearnerCourseAssessments(accessToken, courseId);
      setData(response);
      setAssessments(response.assessments ?? []);
    } catch (error) {
      setData(null);
      setAssessments([]);
      setError(getErrorMessage(error, "Unable to load course assessments."));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, canFetch, courseId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { assessments, canFetch, data, error, isLoading, refetch: load };
}
