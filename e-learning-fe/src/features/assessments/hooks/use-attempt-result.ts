"use client";

import { useCallback, useEffect, useState } from "react";

import { createOrResumeAttempt, getAttemptResult } from "../api/assessment-api";

import type {
  AssessmentAttemptResult,
  CreateAttemptResponse,
} from "../types/assessment";

type UseAttemptResultArgs = {
  accessToken?: string | null;
  courseId?: string | null;
  assessmentId?: string | null;
  attemptId?: string | null;
  enabled?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAttemptResult({
  accessToken,
  courseId,
  assessmentId,
  attemptId,
  enabled = true,
}: UseAttemptResultArgs) {
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);

  const canFetch = Boolean(
    enabled && accessToken && courseId && assessmentId && attemptId,
  );

  const load = useCallback(async () => {
    if (!canFetch || !accessToken || !courseId || !assessmentId || !attemptId) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextResult = await getAttemptResult(
        accessToken,
        courseId,
        assessmentId,
        attemptId,
      );

      setResult(nextResult);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load attempt result."));
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, assessmentId, attemptId, canFetch, courseId]);

  const retake = useCallback(async (): Promise<CreateAttemptResponse> => {
    if (!accessToken || !courseId || !assessmentId) {
      throw new Error("Missing assessment context.");
    }

    setIsRetaking(true);
    setError(null);

    try {
      return await createOrResumeAttempt(accessToken, courseId, assessmentId);
    } catch (error) {
      const message = getErrorMessage(error, "Unable to start a new attempt.");
      setError(message);
      throw new Error(message);
    } finally {
      setIsRetaking(false);
    }
  }, [accessToken, assessmentId, courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    canFetch,
    error,
    isLoading,
    isRetaking,
    refetch: load,
    result,
    retake,
  };
}
