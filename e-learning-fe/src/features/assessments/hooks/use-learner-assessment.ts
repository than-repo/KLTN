"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const canFetch = Boolean(enabled && accessToken && courseId && assessmentId);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: Promise<void> | null = null;

    function load(background = false): Promise<void> {
      if (pending) return pending;
      clearTimeout(timer);
      pending = (async () => {
        let shouldPoll = false;
        if (!canFetch || !accessToken || !courseId || !assessmentId) {
          setAssessment(null);
          setHistory(null);
          setError(null);
          setIsLoading(false);
          return;
        }
        if (!background) setIsLoading(true);
        setError(null);
        try {
          const nextAssessment = await getLearnerAssessment(
            accessToken,
            courseId,
            assessmentId,
          );
          if (cancelled) return;
          setAssessment(nextAssessment);
          shouldPoll = nextAssessment.state === "FINALIZING";
          if (includeHistory && (!background || !shouldPoll)) {
            const nextHistory = await getAssessmentHistory(
              accessToken,
              courseId,
              assessmentId,
            );
            if (cancelled) return;
            setHistory(nextHistory);
          } else if (!includeHistory) {
            setHistory(null);
          }
        } catch (error) {
          shouldPoll = false;
          if (cancelled) return;
          setError(getErrorMessage(error, "Unable to load assessment."));
          setAssessment(null);
          setHistory(null);
        } finally {
          pending = null;
          if (!cancelled) {
            setIsLoading(false);
            if (shouldPoll) timer = setTimeout(() => void load(true), 2000);
          }
        }
      })();
      return pending;
    }

    loadRef.current = () => load();
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      loadRef.current = async () => {};
    };
  }, [accessToken, assessmentId, canFetch, courseId, includeHistory]);

  const refetch = useCallback(() => loadRef.current(), []);

  return {
    assessment,
    canFetch,
    error,
    history,
    isLoading,
    refetch,
  };
}
