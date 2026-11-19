"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";

import { createInstructorAssessmentDraft } from "../api/instructor-assessment-api";
import { getInstructorCourseSections } from "../api/instructor-course-api";
import { getInstructorCourseLessons } from "../api/instructor-lesson-api";
import type {
  AssessmentType,
  CreateAssessmentPayload,
} from "../types/instructor-assessment";
import type { Section } from "../types/instructor-course";
import {
  addDays,
  getNextMondayAtEight,
  setTime,
  toDatetimeLocalValue,
  toIsoOrUndefined,
} from "../utils/assessment-datetime";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

type FormState = {
  availableFrom: string;
  availableUntil: string;
  afterLessonId: string;
  description: string;
  maxAttempts: number | "";
  passingScore: number | "";
  timeLimitMinutes: number | "";
  title: string;
  type: AssessmentType;
};

const initialForm: FormState = {
  availableFrom: "",
  availableUntil: "",
  afterLessonId: "",
  description: "",
  maxAttempts: 1,
  passingScore: 70,
  timeLimitMinutes: 30,
  title: "",
  type: "QUIZ",
};

type CreateAssessmentFormProps = {
  courseId: string;
};

export function CreateAssessmentForm({ courseId }: CreateAssessmentFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(
    null,
  );
  const [successModal, setSuccessModal] = useState<{
    message: string;
    redirectTo: string;
  } | null>(null);

  // Lesson selection state
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form],
  );

  function showError(message: string) {
    setSuccessModal(null);
    setErrorModalMessage(message);
  }

  function showSuccess(message: string, redirectTo: string) {
    setErrorModalMessage(null);
    setSuccessModal({ message, redirectTo });
  }

  function closeSuccessModal() {
    const redirectTo = successModal?.redirectTo;

    setSuccessModal(null);

    if (redirectTo) {
      router.push(redirectTo);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setAvailabilityPreset(preset: "now" | "tomorrow" | "nextMonday") {
    const now = new Date();

    if (preset === "now") {
      update("availableFrom", toDatetimeLocalValue(now));
      update("availableUntil", toDatetimeLocalValue(addDays(now, 7)));
      return;
    }

    if (preset === "tomorrow") {
      update(
        "availableFrom",
        toDatetimeLocalValue(setTime(addDays(now, 1), 8, 0)),
      );
      update(
        "availableUntil",
        toDatetimeLocalValue(setTime(addDays(now, 8), 23, 59)),
      );
      return;
    }

    const from = getNextMondayAtEight();

    update("availableFrom", toDatetimeLocalValue(from));
    update(
      "availableUntil",
      toDatetimeLocalValue(setTime(addDays(from, 7), 23, 59)),
    );
  }

  function extendUntil(days: number) {
    const baseDate = form.availableFrom
      ? new Date(form.availableFrom)
      : new Date();

    if (Number.isNaN(baseDate.getTime())) return;

    const until = addDays(baseDate, days);

    until.setHours(23, 59, 0, 0);
    update("availableUntil", toDatetimeLocalValue(until));
  }

  function clearAvailability() {
    update("availableFrom", "");
    update("availableUntil", "");
  }

  function validateForm() {
    if (!form.title.trim()) {
      return "Title is required.";
    }

    if (
      form.passingScore !== "" &&
      (Number(form.passingScore) < 0 || Number(form.passingScore) > 100)
    ) {
      return "Passing score must be between 0 and 100.";
    }

    if (
      form.maxAttempts !== "" &&
      (Number(form.maxAttempts) < 1 || Number(form.maxAttempts) > 100)
    ) {
      return "Max attempts must be between 1 and 10.";
    }

    if (
      form.timeLimitMinutes !== "" &&
      (Number(form.timeLimitMinutes) < 1 || Number(form.timeLimitMinutes) > 60)
    ) {
      return "Time limit must be between 1 and 60 minutes.";
    }

    if (form.availableFrom && form.availableUntil) {
      const from = new Date(form.availableFrom).getTime();
      const until = new Date(form.availableUntil).getTime();

      if (!Number.isNaN(from) && !Number.isNaN(until) && until <= from) {
        return "Available until must be after available from.";
      }
    }

    return null;
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelModal(true);
      return;
    }

    router.back();
  }

  function discardChanges() {
    setShowCancelModal(false);
    router.back();
  }

  async function loadLessons() {
    if (!accessToken) return;

    try {
      setLoadingLessons(true);
      const sectionList = await getInstructorCourseSections(
        courseId,
        { includeDeleted: false, isActive: true, limit: 100 },
        accessToken,
      );

      // Fetch lessons for each section in parallel
      const sectionsWithLessons = await Promise.all(
        sectionList.map(async (section) => {
          try {
            const lessons = await getInstructorCourseLessons(
              courseId,
              section.id,
              { limit: 100, sortDirection: "asc", sortField: "lessonIndex" },
              accessToken,
            );
            return { ...section, lessons };
          } catch {
            return { ...section, lessons: section.lessons ?? [] };
          }
        }),
      );

      setSections(sectionsWithLessons);
    } catch (loadError) {
      // Silently fail - lesson selector is optional
      console.warn("Could not load lessons:", loadError);
    } finally {
      setLoadingLessons(false);
    }
  }

  useEffect(() => {
    loadLessons();
  }, [courseId, accessToken]);

  function getLessonOptions() {
    const lessonOptions: {
      value: string;
      label: string;
      sectionTitle?: string;
    }[] = [
      { value: "", label: "No lesson (assessment appears at course start)" },
    ];

    for (const section of sections) {
      if (section.lessons && section.lessons.length > 0) {
        for (const lesson of section.lessons) {
          if (lesson.isActive) {
            lessonOptions.push({
              value: lesson.id,
              label: `${lesson.title} (Lesson ${lesson.lessonIndex})`,
              sectionTitle: section.title,
            });
          }
        }
      }
    }

    return lessonOptions;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      showError(validationError);
      return;
    }

    if (!accessToken) {
      showError("Your session is not ready. Please sign in again.");
      return;
    }

    try {
      setLoading(true);

      const payload: CreateAssessmentPayload = {
        availableFrom: toIsoOrUndefined(form.availableFrom),
        availableUntil: toIsoOrUndefined(form.availableUntil),
        afterLesson: form.afterLessonId || undefined,
        description: form.description.trim() || undefined,
        maxAttempts:
          form.maxAttempts === "" ? undefined : Number(form.maxAttempts),
        passingScore:
          form.passingScore === "" ? undefined : Number(form.passingScore),
        timeLimitMinutes:
          form.timeLimitMinutes !== ""
            ? Number(form.timeLimitMinutes)
            : undefined,
        title: form.title.trim(),
        type: form.type,
      };

      const created = await createInstructorAssessmentDraft(
        courseId,
        payload,
        accessToken,
      );

      showSuccess(
        "Assessment created successfully. You can now add questions.",
        `/instructor/courses/${courseId}/assessments/${created.id}/questions`,
      );
    } catch (createError) {
      showError(getErrorMessage(createError, "Could not create assessment."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="grid gap-5">
      <form
        className="grid gap-5 rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="text-sm font-medium" htmlFor="assessment-title">
            Title
          </label>
          <input
            className={fieldClasses}
            id="assessment-title"
            onChange={(event) => update("title", event.target.value)}
            placeholder="Example: JavaScript fundamentals quiz"
            required
            value={form.title}
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="assessment-desc">
            Description
          </label>
          <textarea
            className={fieldClasses}
            id="assessment-desc"
            onChange={(event) => update("description", event.target.value)}
            placeholder="Describe what learners need to complete."
            rows={4}
            value={form.description}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium"
              htmlFor="assessment-after-lesson"
            >
              Position after lesson (optional)
            </label>
            <select
              className={fieldClasses}
              id="assessment-after-lesson"
              onChange={(event) => update("afterLessonId", event.target.value)}
              value={form.afterLessonId}
              disabled={loadingLessons}
            >
              <option value="">
                No lesson (assessment appears at course start)
              </option>
              {(() => {
                const lessonOptions = getLessonOptions();
                const sectionsMap = new Map<string, typeof lessonOptions>();
                for (const opt of lessonOptions) {
                  const sectionTitle = opt.sectionTitle ?? "Other";
                  if (!sectionsMap.has(sectionTitle)) {
                    sectionsMap.set(sectionTitle, []);
                  }
                  sectionsMap.get(sectionTitle)!.push(opt);
                }
                return Array.from(sectionsMap.entries()).map(
                  ([sectionTitle, lessons]) => (
                    <optgroup key={sectionTitle} label={sectionTitle}>
                      {lessons.map((lesson) => (
                        <option key={lesson.value} value={lesson.value}>
                          {lesson.label}
                        </option>
                      ))}
                    </optgroup>
                  ),
                );
              })()}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              The assessment will appear after the selected lesson in the course
              curriculum. Leave empty to place at the start of the course.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="assessment-pass">
              Passing score (%)
            </label>
            <input
              className={fieldClasses}
              id="assessment-pass"
              max={100}
              min={0}
              onChange={(event) =>
                update(
                  "passingScore",
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              placeholder="Example: 70"
              type="number"
              value={form.passingScore}
            />
          </div>

          <div>
            <label
              className="text-sm font-medium"
              htmlFor="assessment-attempts"
            >
              Max attempts
            </label>
            <input
              className={fieldClasses}
              id="assessment-attempts"
              max={100}
              min={1}
              onChange={(event) =>
                update(
                  "maxAttempts",
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              placeholder="Leave empty for unlimited"
              type="number"
              value={form.maxAttempts}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="assessment-time">
              Time limit minutes
            </label>
            <input
              className={fieldClasses}
              id="assessment-time"
              max={60}
              min={1}
              onChange={(event) =>
                update(
                  "timeLimitMinutes",
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              placeholder="Example: 30"
              type="number"
              value={form.timeLimitMinutes}
            />
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface-pearl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Availability window</p>
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-danger/40 bg-card px-3 text-xs font-semibold text-danger hover:bg-danger/10"
              onClick={clearAvailability}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <PresetButton
              label="Available now (7 days)"
              onClick={() => setAvailabilityPreset("now")}
            />
            <PresetButton
              label="Tomorrow 8:00"
              onClick={() => setAvailabilityPreset("tomorrow")}
            />
            <PresetButton
              label="Next Monday"
              onClick={() => setAvailabilityPreset("nextMonday")}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="available-from">
                Available from
              </label>
              <input
                className={fieldClasses}
                id="available-from"
                onChange={(event) =>
                  update("availableFrom", event.target.value)
                }
                type="datetime-local"
                value={form.availableFrom}
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="available-until">
                Available until
              </label>
              <input
                className={fieldClasses}
                id="available-until"
                onChange={(event) =>
                  update("availableUntil", event.target.value)
                }
                type="datetime-local"
                value={form.availableUntil}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Set end date:</span>
            <PresetButton label="+1 day" onClick={() => extendUntil(1)} />
            <PresetButton label="+3 days" onClick={() => extendUntil(3)} />
            <PresetButton label="+7 days" onClick={() => extendUntil(7)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-base font-semibold transition-colors hover:bg-muted"
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating..." : "Create assessment"}
          </button>
        </div>
      </form>
      <InstructorModal
        onClose={() => setShowCancelModal(false)}
        open={showCancelModal}
        title="Discard assessment?"
      >
        <p>
          You have unsaved changes. If you leave this page now, this draft
          assessment will not be created.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setShowCancelModal(false)}
            type="button"
          >
            Keep editing
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground"
            onClick={discardChanges}
            type="button"
          >
            Discard
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
        onClose={closeSuccessModal}
        open={successModal !== null}
        title="Success"
      >
        <p className="whitespace-pre-wrap text-success">
          {successModal?.message}
        </p>
      </InstructorModal>
    </div>
  );
}

function PresetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
