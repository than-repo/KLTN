"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getAssessmentHistory,
  getLearnerAssessment,
} from "../api/assessment-api";

import type { AssessmentHistory, LearnerAssessment } from "../types/assessment";

type UseLearnerAssessmentArgs = {
  accessToken?: string | null;
  courseId?: string | null;
  assessmentId?: string | null;
  enabled?: boolean;
  includeHistory?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useLearnerAssessment({
  accessToken,
  courseId,
  assessmentId,
  enabled = true,
  includeHistory = true,
}: UseLearnerAssessmentArgs) {
  const [assessment, setAssessment] = useState<LearnerAssessment | null>(null);
  const [history, setHistory] = useState<AssessmentHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canFetch = Boolean(enabled && accessToken && courseId && assessmentId);

  const load = useCallback(async () => {
    if (!canFetch || !accessToken || !courseId || !assessmentId) {
      setAssessment(null);
      setHistory(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextAssessment = await getLearnerAssessment(
        accessToken,
        courseId,
        assessmentId,
      );

      setAssessment(nextAssessment);

      if (includeHistory) {
        const nextHistory = await getAssessmentHistory(
          accessToken,
          courseId,
          assessmentId,
        );

        setHistory(nextHistory);
      } else {
        setHistory(null);
      }
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load assessment."));
      setAssessment(null);
      setHistory(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, assessmentId, canFetch, courseId, includeHistory]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    assessment,
    canFetch,
    error,
    history,
    isLoading,
    refetch: load,
  };
}
