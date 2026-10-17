"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  createInstructorAssessmentQuestion,
  deleteInstructorAssessmentQuestion,
  getInstructorAssessmentAnswer,
  updateInstructorAssessmentQuestion,
  upsertInstructorAssessmentAnswer,
} from "../api/instructor-assessment-question-api";
import { getInstructorAssessmentDetail } from "../api/instructor-assessment-api";
import type {
  AssessmentQuestion,
  AssessmentQuestionType,
  DetailedAssessment,
} from "../types/instructor-assessment";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 disabled:bg-muted disabled:text-muted-foreground";

type QuestionFormState = {
  correctOptionIndex: number;
  correctTextAnswer: string;
  explanation: string;
  multipleChoiceOptions: string[];
  points: number;
  questionText: string;
  trueFalseCorrectAnswer: "true" | "false";
  type: AssessmentQuestionType;
};

const emptyForm: QuestionFormState = {
  correctOptionIndex: 0,
  correctTextAnswer: "",
  explanation: "",
  multipleChoiceOptions: ["", "", "", ""],
  points: 1,
  questionText: "",
  trueFalseCorrectAnswer: "true",
  type: "MULTIPLE_CHOICE",
};

function questionTypeLabel(type: AssessmentQuestionType) {
  if (type === "MULTIPLE_CHOICE") return "Multiple choice";
  if (type === "TRUE_FALSE") return "True / False";
  if (type === "FILL_IN_THE_BLANK") return "Fill in the blank";
  return type;
}

function normalizeMultipleChoiceOptions(question: AssessmentQuestion) {
  const correctAnswer = question.answer?.correctOptionAnswer || "";
  const wrongAnswers = Array.isArray(question.answer?.wrongAnswers)
    ? question.answer.wrongAnswers
    : [];

  const options = [correctAnswer, ...wrongAnswers]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  while (options.length < 4) {
    options.push("");
  }

  return options;
}

function getCorrectOptionIndex(
  options: string[],
  correctAnswer?: string | null,
) {
  const index = options.findIndex(
    (option) => option.trim() === correctAnswer?.trim(),
  );

  return index >= 0 ? index : 0;
}

type AssessmentQuestionsManagerProps = {
  assessmentId: string;
  courseId: string;
};

export function AssessmentQuestionsManager({
  assessmentId,
  courseId,
}: AssessmentQuestionsManagerProps) {
  const { accessToken, status } = useAuth();

  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [form, setForm] = useState<QuestionFormState>(emptyForm);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] =
    useState<AssessmentQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(
    null,
  );
  const [successModalMessage, setSuccessModalMessage] = useState<string | null>(
    null,
  );

  function showError(message: string) {
    setSuccessModalMessage(null);
    setErrorModalMessage(message);
  }

  function showSuccess(message: string) {
    setErrorModalMessage(null);
    setSuccessModalMessage(message);
  }

  async function loadAssessment(silent = false) {
    if (!accessToken) return;

    try {
      const data = await getInstructorAssessmentDetail(
        courseId,
        assessmentId,
        accessToken,
      );

      if (!silent) {
        setErrorModalMessage(null);
      }

      setAssessment(data);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (loadError) {
      showError(getErrorMessage(loadError, "Could not load assessment."));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loader manages its own async loading state
    void loadAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, assessmentId, courseId, status]);

  function updateForm(patch: Partial<QuestionFormState>) {
    setForm((prevForm) => ({ ...prevForm, ...patch }));
  }

  function closeQuestionModal() {
    setIsQuestionModalOpen(false);
    setEditingQuestionId(null);
    setForm(emptyForm);
  }

  function openCreateQuestion() {
    setEditingQuestionId(null);
    setForm(emptyForm);
    setIsQuestionModalOpen(true);
  }

  async function openEditQuestion(question: AssessmentQuestion) {
    if (!accessToken) return;

    try {
      let answer = question.answer;

      if (!answer) {
        try {
          answer = await getInstructorAssessmentAnswer(
            courseId,
            assessmentId,
            question.id,
            accessToken,
          );
        } catch {
          answer = null;
        }
      }

      let nextForm: QuestionFormState = {
        ...emptyForm,
        explanation: question.explanation || "",
        points: question.points || 1,
        questionText: question.questionText,
        type: question.type,
      };

      if (question.type === "MULTIPLE_CHOICE") {
        const options = normalizeMultipleChoiceOptions(question);

        nextForm = {
          ...nextForm,
          correctOptionIndex: getCorrectOptionIndex(
            options,
            answer?.correctOptionAnswer || "",
          ),
          multipleChoiceOptions: options,
        };
      }

      if (question.type === "TRUE_FALSE") {
        nextForm = {
          ...nextForm,
          trueFalseCorrectAnswer:
            String(answer?.correctTextAnswer || "").toLowerCase() === "false"
              ? "false"
              : "true",
        };
      }

      if (question.type === "FILL_IN_THE_BLANK") {
        nextForm = {
          ...nextForm,
          correctTextAnswer: answer?.correctTextAnswer || "",
        };
      }

      setEditingQuestionId(question.id);
      setForm(nextForm);
      setIsQuestionModalOpen(true);
    } catch (loadError) {
      showError(getErrorMessage(loadError, "Could not load the answer."));
    }
  }

  function validateForm(): string | null {
    if (!form.questionText.trim()) {
      return "Question text is required.";
    }

    if (form.type === "MULTIPLE_CHOICE") {
      const filledOptions = form.multipleChoiceOptions
        .map((option) => option.trim())
        .filter(Boolean);

      if (filledOptions.length < 2) {
        return "Please provide at least 2 options.";
      }
    }

    if (form.type === "FILL_IN_THE_BLANK" && !form.correctTextAnswer.trim()) {
      return "Correct text answer is required.";
    }

    return null;
  }

  function buildAnswerPayload() {
    if (form.type === "MULTIPLE_CHOICE") {
      const correctOptionAnswer =
        form.multipleChoiceOptions[form.correctOptionIndex]?.trim() || "";
      const wrongAnswers = form.multipleChoiceOptions
        .filter((_, index) => index !== form.correctOptionIndex)
        .map((option) => option.trim())
        .filter(Boolean);

      return {
        correctOptionAnswer,
        wrongAnswers,
      };
    }

    if (form.type === "TRUE_FALSE") {
      return {
        correctTextAnswer: form.trueFalseCorrectAnswer,
        wrongAnswers:
          form.trueFalseCorrectAnswer === "true" ? ["false"] : ["true"],
      };
    }

    return { correctTextAnswer: form.correctTextAnswer.trim() };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      showError("Your session is not ready. Please sign in again.");
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      setSaving(true);

      let questionId = editingQuestionId;

      if (questionId) {
        const updatedQuestion = await updateInstructorAssessmentQuestion(
          courseId,
          assessmentId,
          questionId,
          {
            explanation: form.explanation.trim() || undefined,
            points: form.points,
            questionText: form.questionText.trim(),
            type: form.type,
          },
          accessToken,
        );

        questionId = updatedQuestion.id;
      } else {
        const createdQuestion = await createInstructorAssessmentQuestion(
          courseId,
          assessmentId,
          {
            explanation: form.explanation.trim() || undefined,
            points: form.points,
            questionText: form.questionText.trim(),
            type: form.type,
          },
          accessToken,
        );

        questionId = createdQuestion.id;
      }

      await upsertInstructorAssessmentAnswer(
        courseId,
        assessmentId,
        questionId,
        buildAnswerPayload(),
        accessToken,
      );

      closeQuestionModal();
      await loadAssessment(true);
      showSuccess(
        editingQuestionId
          ? "Question updated successfully."
          : "Question created successfully.",
      );
    } catch (submitError) {
      showError(getErrorMessage(submitError, "Could not save question."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteQuestion() {
    if (!questionToDelete || !accessToken) return;

    try {
      setDeleting(true);

      await deleteInstructorAssessmentQuestion(
        courseId,
        assessmentId,
        questionToDelete.id,
        accessToken,
      );

      setQuestionToDelete(null);
      await loadAssessment(true);
      showSuccess("Question deleted successfully.");
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, "Could not delete question."));
    } finally {
      setDeleting(false);
    }
  }
  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-28 rounded-lg border border-border bg-card" />
        <div className="h-40 rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const totalPoints = questions.reduce(
    (sum, question) => sum + (question.points || 0),
    0,
  );
  const questionsNeedingAnswers = questions.filter(
    (question) => !question.answer,
  ).length;

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">
                {assessment?.title ?? "Assessment"}
              </h2>
              <Badge
                variant={
                  assessment?.status === "PUBLISHED" ? "action" : "warning"
                }
              >
                {assessment?.status || "DRAFT"}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create questions, set the correct answers, and review the answer
              summary before publishing.
            </p>
          </div>

          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
            onClick={openCreateQuestion}
            type="button"
          >
            Add question
          </button>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div className="rounded-md border border-border bg-surface-pearl px-4 py-3">
            <dt className="font-semibold text-ink-muted">Total questions</dt>
            <dd className="mt-1 text-muted-foreground">{questions.length}</dd>
          </div>
          <div className="rounded-md border border-border bg-surface-pearl px-4 py-3">
            <dt className="font-semibold text-ink-muted">Total points</dt>
            <dd className="mt-1 text-muted-foreground">{totalPoints}</dd>
          </div>
          <div className="rounded-md border border-border bg-surface-pearl px-4 py-3">
            <dt className="font-semibold text-ink-muted">Needs answers</dt>
            <dd className="mt-1 text-muted-foreground">
              {questionsNeedingAnswers}
            </dd>
          </div>
        </dl>
      </div>
      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-14 text-center">
          <p className="text-lg font-semibold">No questions yet</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Add your first question to start building this quiz.
          </p>
        </div>
      ) : (
        <ol className="grid gap-4">
          {questions.map((question, index) => (
            <li
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
              key={question.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Question {index + 1}</Badge>
                    <Badge>{questionTypeLabel(question.type)}</Badge>
                    <Badge variant="action">
                      {question.points || 0} point
                      {(question.points || 0) === 1 ? "" : "s"}
                    </Badge>
                    {!question.answer ? (
                      <Badge variant="danger">Missing answer</Badge>
                    ) : null}
                  </div>

                  <p className="mt-3 whitespace-pre-wrap font-medium">
                    {question.questionText}
                  </p>

                  {question.explanation ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {question.explanation}
                    </p>
                  ) : null}

                  <AnswerSummary question={question} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                    onClick={() => openEditQuestion(question)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-danger/40 bg-card px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                    onClick={() => setQuestionToDelete(question)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <InstructorModal
        onClose={closeQuestionModal}
        open={isQuestionModalOpen}
        title={editingQuestionId ? "Edit question" : "New question"}
      >
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium" htmlFor="question-text">
              Question text
            </label>
            <textarea
              className={fieldClasses}
              id="question-text"
              onChange={(event) =>
                updateForm({ questionText: event.target.value })
              }
              placeholder="Enter your question here"
              rows={3}
              value={form.questionText}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="question-type">
                Type
              </label>
              <select
                className={fieldClasses}
                id="question-type"
                onChange={(event) =>
                  updateForm({
                    type: event.target.value as AssessmentQuestionType,
                  })
                }
                value={form.type}
              >
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="FILL_IN_THE_BLANK">Fill in the blank</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="question-points">
                Points
              </label>
              <input
                className={fieldClasses}
                id="question-points"
                min={1}
                onChange={(event) =>
                  updateForm({ points: Number(event.target.value) || 1 })
                }
                type="number"
                value={form.points}
              />
            </div>
          </div>

          <div>
            <label
              className="text-sm font-medium"
              htmlFor="question-explanation"
            >
              Explanation (optional)
            </label>
            <textarea
              className={fieldClasses}
              id="question-explanation"
              onChange={(event) =>
                updateForm({ explanation: event.target.value })
              }
              placeholder="Shown to learners during review"
              rows={2}
              value={form.explanation}
            />
          </div>

          {form.type === "MULTIPLE_CHOICE" ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">
                Options (select the correct one)
              </p>
              {form.multipleChoiceOptions.map((option, optionIndex) => (
                <div className="flex items-center gap-2" key={optionIndex}>
                  <input
                    aria-label={`Option ${optionIndex + 1} correct`}
                    checked={form.correctOptionIndex === optionIndex}
                    name="correct-option"
                    onChange={() =>
                      updateForm({ correctOptionIndex: optionIndex })
                    }
                    type="radio"
                  />
                  <input
                    className="min-h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => {
                      const nextOptions = [...form.multipleChoiceOptions];

                      nextOptions[optionIndex] = event.target.value;
                      updateForm({ multipleChoiceOptions: nextOptions });
                    }}
                    placeholder={`Option ${optionIndex + 1}`}
                    value={option}
                  />
                </div>
              ))}
            </div>
          ) : null}
          {form.type === "TRUE_FALSE" ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">Correct answer</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={form.trueFalseCorrectAnswer === "true"}
                    name="true-false-answer"
                    onChange={() =>
                      updateForm({ trueFalseCorrectAnswer: "true" })
                    }
                    type="radio"
                  />
                  True
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={form.trueFalseCorrectAnswer === "false"}
                    name="true-false-answer"
                    onChange={() =>
                      updateForm({ trueFalseCorrectAnswer: "false" })
                    }
                    type="radio"
                  />
                  False
                </label>
              </div>
            </div>
          ) : null}

          {form.type === "FILL_IN_THE_BLANK" ? (
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="correct-text-answer"
              >
                Correct text answer
              </label>
              <input
                className={fieldClasses}
                id="correct-text-answer"
                onChange={(event) =>
                  updateForm({ correctTextAnswer: event.target.value })
                }
                placeholder="Enter the expected answer"
                value={form.correctTextAnswer}
              />
            </div>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
              onClick={closeQuestionModal}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving
                ? "Saving..."
                : editingQuestionId
                  ? "Update question"
                  : "Create question"}
            </button>
          </div>
        </form>
      </InstructorModal>
      <InstructorModal
        onClose={() => setQuestionToDelete(null)}
        open={questionToDelete !== null}
        title="Delete question"
      >
        <p>
          Are you sure you want to delete this question? This action cannot be
          undone.
        </p>
        {questionToDelete ? (
          <p className="mt-3 rounded-md border border-border bg-surface-pearl p-3 text-sm text-foreground">
            {questionToDelete.questionText}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold disabled:opacity-50"
            disabled={deleting}
            onClick={() => setQuestionToDelete(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground disabled:opacity-50"
            disabled={deleting}
            onClick={confirmDeleteQuestion}
            type="button"
          >
            {deleting ? "Deleting..." : "Delete question"}
          </button>
        </div>
      </InstructorModal>

      <InstructorModal
        onClose={() => setErrorModalMessage(null)}
        open={errorModalMessage !== null}
        title="Something went wrong"
      >
        <p className="whitespace-pre-wrap text-danger">{errorModalMessage}</p>
      </InstructorModal>

      <InstructorModal
        onClose={() => setSuccessModalMessage(null)}
        open={successModalMessage !== null}
        title="Success"
      >
        <p className="whitespace-pre-wrap text-success">
          {successModalMessage}
        </p>
      </InstructorModal>
    </div>
  );
}

function AnswerSummary({ question }: { question: AssessmentQuestion }) {
  if (!question.answer) {
    return (
      <p className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
        This question has no saved answer yet. Edit it to add one.
      </p>
    );
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const correctAnswer = question.answer.correctOptionAnswer || "";
    const options = [
      correctAnswer,
      ...(question.answer.wrongAnswers ?? []),
    ].filter(Boolean);

    return (
      <ul className="mt-3 grid gap-2">
        {options.map((option, optionIndex) => {
          const isCorrect = option.trim() === correctAnswer.trim();

          return (
            <li
              className={`rounded-md border px-3 py-2 text-sm ${
                isCorrect
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-surface-pearl text-muted-foreground"
              }`}
              key={`${option}-${optionIndex}`}
            >
              {isCorrect ? "✓ " : ""}
              {option}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <p className="mt-3 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
      Correct answer: {question.answer.correctTextAnswer || "-"}
    </p>
  );
}
