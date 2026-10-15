"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createOrResumeAttempt,
  getActiveAttempt,
  saveAttemptAnswer,
  submitAttempt,
  submitProjectAssessment,
} from "../api/assessment-api";

import type {
  ActiveAttempt,
  AssessmentAttemptResult,
  CreateAttemptResponse,
  SaveAttemptAnswerResponse,
  SubmitProjectInput,
  SubmitProjectResponse,
} from "../types/assessment";

type UseAssessmentAttemptArgs = {
  accessToken?: string | null;
  courseId?: string | null;
  assessmentId?: string | null;
  attemptId?: string | null;
  enabled?: boolean;
  autoLoad?: boolean;
};

type SavingMap = Record<string, boolean>;
type ErrorMap = Record<string, string | null>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getInitialAnswers(attempt: ActiveAttempt) {
  return attempt.savedAnswers.reduce<Record<string, string>>(
    (result, savedAnswer) => {
      result[savedAnswer.questionId] = savedAnswer.answer ?? "";
      return result;
    },
    {},
  );
}

export function useAssessmentAttempt({
  accessToken,
  courseId,
  assessmentId,
  attemptId,
  enabled = true,
  autoLoad = true,
}: UseAssessmentAttemptArgs) {
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(
    null,
  );
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<ErrorMap>({});
  const [savingQuestionIds, setSavingQuestionIds] = useState<SavingMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  const canUseApi = Boolean(enabled && accessToken && courseId && assessmentId);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((answer) => answer.trim().length > 0)
      .length;
  }, [answers]);

  const totalQuestions = activeAttempt?.questions.length ?? 0;

  const isSaving = useMemo(() => {
    return Object.values(savingQuestionIds).some(Boolean);
  }, [savingQuestionIds]);

  const applyAttempt = useCallback((attempt: ActiveAttempt) => {
    setActiveAttempt(attempt);
    setAnswers(getInitialAnswers(attempt));
    setResult(null);
  }, []);

  const loadAttempt = useCallback(
    async (nextAttemptId?: string) => {
      const targetAttemptId = nextAttemptId ?? attemptId;

      if (
        !canUseApi ||
        !accessToken ||
        !courseId ||
        !assessmentId ||
        !targetAttemptId
      ) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const attempt = await getActiveAttempt(
          accessToken,
          courseId,
          assessmentId,
          targetAttemptId,
        );

        applyAttempt(attempt);

        return attempt;
      } catch (error) {
        setError(getErrorMessage(error, "Unable to load assessment attempt."));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, applyAttempt, assessmentId, attemptId, canUseApi, courseId],
  );

  const startOrResume =
    useCallback(async (): Promise<CreateAttemptResponse> => {
      if (!canUseApi || !accessToken || !courseId || !assessmentId) {
        throw new Error("Missing assessment context.");
      }

      setIsStarting(true);
      setError(null);

      try {
        const response = await createOrResumeAttempt(
          accessToken,
          courseId,
          assessmentId,
        );

        await loadAttempt(response.attemptId);

        return response;
      } catch (error) {
        const message = getErrorMessage(error, "Unable to start assessment.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsStarting(false);
      }
    }, [accessToken, assessmentId, canUseApi, courseId, loadAttempt]);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));

    setSaveErrors((currentErrors) => ({
      ...currentErrors,
      [questionId]: null,
    }));
  }, []);

  const saveAnswer = useCallback(
    async (
      questionId: string,
      answerInput?: string,
      answerSnapshot?: string,
    ): Promise<SaveAttemptAnswerResponse | null> => {
      if (
        !canUseApi ||
        !accessToken ||
        !courseId ||
        !assessmentId ||
        !activeAttempt
      ) {
        return null;
      }

      const answer = answerInput ?? answers[questionId] ?? "";

      if (!answer.trim()) {
        setSaveErrors((currentErrors) => ({
          ...currentErrors,
          [questionId]: "Answer is required before saving.",
        }));

        return null;
      }

      setSavingQuestionIds((currentSavingIds) => ({
        ...currentSavingIds,
        [questionId]: true,
      }));

      setSaveErrors((currentErrors) => ({
        ...currentErrors,
        [questionId]: null,
      }));

      try {
        const response = await saveAttemptAnswer(
          accessToken,
          courseId,
          assessmentId,
          activeAttempt.attemptId,
          questionId,
          {
            answer,
            answerSnapshot,
          },
        );

        return response;
      } catch (error) {
        setSaveErrors((currentErrors) => ({
          ...currentErrors,
          [questionId]: getErrorMessage(error, "Unable to save answer."),
        }));

        return null;
      } finally {
        setSavingQuestionIds((currentSavingIds) => ({
          ...currentSavingIds,
          [questionId]: false,
        }));
      }
    },
    [accessToken, activeAttempt, answers, assessmentId, canUseApi, courseId],
  );

  const submit = useCallback(async (): Promise<AssessmentAttemptResult> => {
    if (
      !canUseApi ||
      !accessToken ||
      !courseId ||
      !assessmentId ||
      !activeAttempt
    ) {
      throw new Error("Missing active attempt.");
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submittedResult = await submitAttempt(
        accessToken,
        courseId,
        assessmentId,
        activeAttempt.attemptId,
      );

      setResult(submittedResult);
      setActiveAttempt(null);

      return submittedResult;
    } catch (error) {
      const message = getErrorMessage(error, "Unable to submit attempt.");
      setError(message);
      throw new Error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, activeAttempt, assessmentId, canUseApi, courseId]);

  const submitProject = useCallback(
    async (input: SubmitProjectInput): Promise<SubmitProjectResponse> => {
      if (
        !canUseApi ||
        !accessToken ||
        !courseId ||
        !assessmentId ||
        !activeAttempt
      ) {
        throw new Error("Missing active project attempt.");
      }

      setIsSubmittingProject(true);
      setError(null);

      try {
        const response = await submitProjectAssessment(
          accessToken,
          courseId,
          assessmentId,
          activeAttempt.attemptId,
          input,
        );

        setActiveAttempt(null);

        return response;
      } catch (error) {
        const message = getErrorMessage(error, "Unable to submit project.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsSubmittingProject(false);
      }
    },
    [accessToken, activeAttempt, assessmentId, canUseApi, courseId],
  );

  const reset = useCallback(() => {
    setActiveAttempt(null);
    setResult(null);
    setAnswers({});
    setError(null);
    setSaveErrors({});
    setSavingQuestionIds({});
    setIsLoading(false);
    setIsStarting(false);
    setIsSubmitting(false);
    setIsSubmittingProject(false);
  }, []);

  useEffect(() => {
    if (!autoLoad || !attemptId) {
      return;
    }

    void loadAttempt(attemptId);
  }, [autoLoad, attemptId, loadAttempt]);

  return {
    activeAttempt,
    answeredCount,
    answers,
    canUseApi,
    error,
    isLoading,
    isSaving,
    isStarting,
    isSubmitting,
    isSubmittingProject,
    loadAttempt,
    reset,
    result,
    saveAnswer,
    saveErrors,
    savingQuestionIds,
    setAnswer,
    startOrResume,
    submit,
    submitProject,
    totalQuestions,
  };
}
