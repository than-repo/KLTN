"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Search, X, Plus } from "lucide-react";

import {
  createInstructorAssessmentQuestion,
  deleteInstructorAssessmentQuestion,
  getInstructorAssessmentAnswer,
  updateInstructorAssessmentQuestion,
  upsertInstructorAssessmentAnswer,
} from "../api/instructor-assessment-question-api";
import { getInstructorAssessmentDetail } from "../api/instructor-assessment-api";
import { getInstructorCourseSkills } from "../api/instructor-skill-api";
import type {
  AssessmentQuestion,
  AssessmentQuestionType,
  DetailedAssessment,
} from "../types/instructor-assessment";
import type { Skill } from "../types/instructor-skill";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";
import { CreateSkillModal } from "./create-skill-modal";

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
  skillIds: string[];
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
  skillIds: [],
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

  // Skills state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Skill creation modal state
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  // Refs to prevent duplicate concurrent fetches
  const loadingSkillsRef = useRef(false);
  const loadingAssessmentRef = useRef(false);

  function showError(message: string) {
    setSuccessModalMessage(null);
    setErrorModalMessage(message);
  }

  function showSuccess(message: string) {
    setErrorModalMessage(null);
    setSuccessModalMessage(message);
  }

  const loadSkills = useCallback(async () => {
    if (!accessToken || loadingSkillsRef.current) return;

    loadingSkillsRef.current = true;

    try {
      setLoadingSkills(true);
      const data = await getInstructorCourseSkills(courseId, accessToken);
      setSkills(data);
    } catch (loadError) {
      console.warn("Could not load skills:", loadError);
    } finally {
      setLoadingSkills(false);
      loadingSkillsRef.current = false;
    }
  }, [accessToken, courseId]);

  const loadAssessmentCallback = useCallback(
    async (silent = false) => {
      if (!accessToken || loadingAssessmentRef.current) return;

      loadingAssessmentRef.current = true;

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
        loadingAssessmentRef.current = false;
      }
    },
    [accessToken, courseId, assessmentId],
  );

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    void loadAssessmentCallback();
    void loadSkills();
  }, [accessToken, assessmentId, courseId, status, loadAssessmentCallback, loadSkills]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter questions based on search query
  const filteredQuestions = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return questions;

    const query = debouncedSearchQuery.toLowerCase().trim();
    return questions.filter((question) => {
      const questionText = question.questionText.toLowerCase();
      const explanation = question.explanation?.toLowerCase() || "";
      const skillNames = question.skills
        ?.map((s) => s.canonicalName.toLowerCase())
        .filter(Boolean)
        .join(" ") || "";

      return (
        questionText.includes(query) ||
        explanation.includes(query) ||
        skillNames.includes(query)
      );
    });
  }, [questions, debouncedSearchQuery]);

  function updateForm(patch: Partial<QuestionFormState>) {
    setForm((prevForm) => ({ ...prevForm, ...patch }));
  }

  function handleSkillSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const selectedOptions = Array.from(event.target.selectedOptions).map(
      (option) => option.value,
    );
    updateForm({ skillIds: selectedOptions });
  }

  function handleRemoveSkill(skillId: string) {
    updateForm({ skillIds: form.skillIds.filter((id) => id !== skillId) });
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
        // Use skills from API response if available, fallback to skillIds
        skillIds: question.skills?.map((s) => s.id) ?? question.skillIds ?? [],
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
      const trimmedOptions = form.multipleChoiceOptions.map((option) => option.trim());

      // Check for empty options
      if (trimmedOptions.some((option) => option === "")) {
        return "All option fields must be filled.";
      }

      // Check for duplicate options
      const uniqueOptions = new Set(trimmedOptions);
      if (uniqueOptions.size !== trimmedOptions.length) {
        return "Options must be unique. Please remove duplicate options.";
      }

      // Check for at least 2 options
      if (trimmedOptions.length < 2) {
        return "Please provide at least 2 options.";
      }

      // Check that a correct option is selected (should always be true due to radio button, but validate anyway)
      if (form.correctOptionIndex < 0 || form.correctOptionIndex >= trimmedOptions.length) {
        return "Please select a correct answer.";
      }

      const correctOption = trimmedOptions[form.correctOptionIndex];
      if (!correctOption) {
        return "The selected correct option cannot be empty.";
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
            skillIds: form.skillIds,
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
            skillIds: form.skillIds,
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
      await loadAssessmentCallback(true);
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
      await loadAssessmentCallback(true);
      showSuccess("Question deleted successfully.");
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, "Could not delete question."));
    } finally {
      setDeleting(false);
    }
  }

  function handleSkillCreated(newSkill: Skill) {
    // Add the new skill to the skills list
    setSkills((prev) => [...prev, newSkill]);
    // Select the new skill in the form
    updateForm({ skillIds: [...form.skillIds, newSkill.id] });
    // Close the skill modal
    setIsSkillModalOpen(false);
  }

  function openSkillModal() {
    setIsSkillModalOpen(true);
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

  // Calculate difficulty breakdown from blueprint or question skills
  const easyCount = assessment?.easyQuestionCount ?? 0;
  const mediumCount = assessment?.mediumQuestionCount ?? 0;
  const hardCount = assessment?.hardQuestionCount ?? 0;
  const totalBlueprintQuestions = easyCount + mediumCount + hardCount;

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold truncate">
                  {assessment?.title ?? "Assessment"}
                </h2>
                <Badge
                  variant={
                    assessment?.status === "PUBLISHED" ? "action" : "neutral"
                  }
                >
                  {assessment?.status || "DRAFT"}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Create questions, set the correct answers, assign skills, and
                review the answer summary before publishing.
              </p>
            </div>

            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus shrink-0"
              onClick={openCreateQuestion}
              type="button"
            >
              <Plus className="size-4 mr-2" />
              Add question
            </button>
          </div>

          <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-border bg-surface-pearl px-4 py-2.5">
              <dt className="font-medium text-ink-muted">Total questions</dt>
              <dd className="mt-0.5 text-muted-foreground">{questions.length}</dd>
            </div>
            <div className="rounded-md border border-border bg-surface-pearl px-4 py-2.5">
              <dt className="font-medium text-ink-muted">Total points</dt>
              <dd className="mt-0.5 text-muted-foreground">{totalPoints}</dd>
            </div>
            <div className="rounded-md border border-border bg-surface-pearl px-4 py-2.5">
              <dt className="font-medium text-ink-muted">Needs answers</dt>
              <dd className="mt-0.5 text-muted-foreground">
                {questionsNeedingAnswers}
              </dd>
            </div>
          </dl>

          {/* Blueprint Difficulty Breakdown */}
          {totalBlueprintQuestions > 0 && (
            <div className="mt-3 rounded-md border border-border bg-surface-pearl p-3.5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-sm font-semibold">Blueprint Difficulty Breakdown</p>
                <Badge variant="action" className="text-xs">Easy: {easyCount}</Badge>
                <Badge variant="neutral" className="text-xs">Medium: {mediumCount}</Badge>
                <Badge variant="danger" className="text-xs">Hard: {hardCount}</Badge>
                <Badge variant="action" className="text-xs">Total: {totalBlueprintQuestions}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure these counts in the assessment edit page under Blueprint Settings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          className={`${fieldClasses} pl-10`}
          placeholder="Search questions by text, explanation, or skill..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Search questions"
        />
        {searchQuery && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-14 text-center">
          <p className="text-lg font-semibold">
            {questions.length === 0 ? "No questions yet" : "No matching questions"}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {questions.length === 0
              ? "Add your first question to start building this quiz."
              : "Try adjusting your search terms."}
          </p>
        </div>
      ) : (
        <ol className="grid gap-4">
          {filteredQuestions.map((question, index) => {
            const originalIndex = questions.findIndex(
              (q) => q.id === question.id,
            );
            const displayIndex = originalIndex >= 0 ? originalIndex + 1 : index + 1;

            // Get assigned skills for display - use question.skills from API directly
            const assignedSkills = question.skills ?? [];

            return (
              <li
                className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
                key={question.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 lg:pr-4">
                    {/* Question Header Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="neutral" className="text-xs font-medium">
                        Question {displayIndex}
                      </Badge>
                      <Badge variant="neutral" className="text-xs font-medium">
                        {questionTypeLabel(question.type)}
                      </Badge>
                      <Badge variant="action" className="text-xs font-medium">
                        {question.points || 0} point
                        {(question.points || 0) === 1 ? "" : "s"}
                      </Badge>
                      {!question.answer ? (
                        <Badge variant="danger" className="text-xs font-medium">Missing answer</Badge>
                      ) : null}
                    </div>

                    {/* Question Stem */}
                    <p className="text-base font-medium leading-relaxed text-foreground">
                      {question.questionText}
                    </p>

                    {/* Explanation */}
                    {question.explanation ? (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        {question.explanation}
                      </p>
                    ) : null}

                    {/* Assigned Skills Row */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">Skills:</span>
                      {assignedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedSkills.map((skill) => {
                            const difficultyColor =
                              skill.difficulty === "EASY"
                                ? "action"
                                : skill.difficulty === "MEDIUM"
                                ? "neutral"
                                : "danger";
                            return (
                              <Badge
                                key={skill.id}
                                variant={difficultyColor}
                                className="text-xs gap-1"
                              >
                                {skill.canonicalName}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No skills assigned</span>
                      )}
                    </div>

                    {/* Answer Summary */}
                    <AnswerSummary question={question} />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0">
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
            );
          })}
        </ol>
      )}

      {/* Question Modal */}
      <InstructorModal
        onClose={closeQuestionModal}
        open={isQuestionModalOpen}
        title={editingQuestionId ? "Edit question" : "New question"}
        size="lg"
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

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="question-skills">
                Skills (optional)
              </label>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                onClick={openSkillModal}
              >
                <Plus className="size-3.5" />
                New skill
              </button>
            </div>
            <select
              className={fieldClasses}
              id="question-skills"
              multiple
              onChange={handleSkillSelectChange}
              value={form.skillIds}
            >
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.canonicalName}
                  {skill.difficulty && ` (${skill.difficulty})`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Hold Ctrl/Cmd to select multiple skills.
            </p>

            {/* Selected skills as badges with remove option */}
            {form.skillIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.skillIds.map((skillId) => {
                  const skill = skills.find((s) => s.id === skillId);
                  if (!skill) return null;
                  const difficultyColor =
                    skill.difficulty === "EASY"
                      ? "action"
                      : skill.difficulty === "MEDIUM"
                      ? "neutral"
                      : "danger";
                  return (
                    <span
                      key={skillId}
                      className="inline-flex items-center gap-1"
                    >
                      <Badge variant={difficultyColor}>
                        {skill.canonicalName}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skillId)}
                        className="inline-flex items-center justify-center rounded-md p-0.5 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                        aria-label={`Remove skill ${skill.canonicalName}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
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

      {/* Skill Creation Modal */}
      <CreateSkillModal
        courseId={courseId}
        onClose={() => setIsSkillModalOpen(false)}
        onSkillCreated={handleSkillCreated}
        open={isSkillModalOpen}
      />

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
      <div className="mt-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm text-danger">
        This question has no saved answer yet. Edit it to add one.
      </div>
    );
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const correctAnswer = question.answer.correctOptionAnswer || "";
    const options = [
      correctAnswer,
      ...(question.answer.wrongAnswers ?? []),
    ].filter(Boolean);

    return (
      <div className="mt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Answer Options</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl">
          {options.map((option, optionIndex) => {
            const isCorrect = option.trim() === correctAnswer.trim();

            return (
              <div
                key={`${option}-${optionIndex}`}
                className={`relative rounded-md border p-3 text-sm transition-colors ${
                  isCorrect
                    ? "border-success/40 bg-success/5 text-success"
                    : "border-border bg-surface-pearl/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <span className="flex-shrink-0 mt-0.5 text-success" aria-hidden="true">✓</span>
                  ) : (
                    <span className="flex-shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true">
                      {String.fromCharCode(97 + optionIndex)}){" "}
                    </span>
                  )}
                  <span className="flex-1 min-w-0 break-words">{option}</span>
                </div>
                {isCorrect && (
                  <span className="absolute top-2 right-2 text-xs font-medium text-success/80 bg-success/10 px-1.5 py-0.5 rounded">
                    Correct
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "TRUE_FALSE") {
    const isTrue = question.answer.correctTextAnswer?.toLowerCase() === "true";
    return (
      <div className="mt-3 rounded-md border border-success/40 bg-success/5 px-3 py-2.5 text-sm text-success">
        <span className="font-medium">Correct answer:</span>{" "}
        {isTrue ? "True" : "False"}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-success/40 bg-success/5 px-3 py-2.5 text-sm text-success">
      <span className="font-medium">Correct answer:</span>{" "}
      {question.answer.correctTextAnswer || "—"}
    </div>
  );
}