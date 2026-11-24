"use client";

import { useState, type FormEvent } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { createInstructorSkill, getInstructorCourseSkills } from "../api/instructor-skill-api";
import type { CreateSkillPayload, Difficulty, Skill } from "../types/instructor-skill";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 disabled:bg-muted disabled:text-muted-foreground";

const difficultyOptions: { label: string; value: Difficulty }[] = [
  { label: "Easy", value: "EASY" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Hard", value: "HARD" },
];

type CreateSkillModalProps = {
  courseId: string;
  onClose: () => void;
  onSkillCreated: (skill: Skill) => void;
  open: boolean;
};

export function CreateSkillModal({
  courseId,
  onClose,
  onSkillCreated,
  open,
}: CreateSkillModalProps) {
  const { accessToken } = useAuth();

  const [form, setForm] = useState<CreateSkillPayload>({
    courseId,
    canonicalName: "",
    description: "",
    aliases: [],
    difficulty: undefined,
    parentId: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateForm<K extends keyof CreateSkillPayload>(
    key: K,
    value: CreateSkillPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errorMessage) setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.canonicalName.trim()) {
      setErrorMessage("Skill name is required.");
      return;
    }

    if (!accessToken) {
      setErrorMessage("Your session is not ready. Please sign in again.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: CreateSkillPayload = {
        courseId,
        canonicalName: form.canonicalName.trim(),
        description: form.description?.trim() || null,
        aliases: form.aliases?.map((a) => a.trim()).filter(Boolean) || [],
        difficulty: form.difficulty,
        parentId: form.parentId,
      };

      const createdSkill = await createInstructorSkill(payload, accessToken);
      setSuccessMessage(`Skill "${createdSkill.canonicalName}" created successfully!`);

      // Notify parent to refresh skills and select the new skill
      onSkillCreated(createdSkill);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not create skill."));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setForm({
      courseId,
      canonicalName: "",
      description: "",
      aliases: [],
      difficulty: undefined,
      parentId: undefined,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  }

  if (!open) return null;

  return (
    <InstructorModal onClose={handleClose} open={true} title="Create new skill" size="md">
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium" htmlFor="skill-canonical-name">
            Skill name <span className="text-danger">*</span>
          </label>
          <input
            className={fieldClasses}
            id="skill-canonical-name"
            onChange={(event) => updateForm("canonicalName", event.target.value)}
            placeholder="Example: JavaScript Arrays"
            value={form.canonicalName}
            maxLength={50}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Short, unique name for this skill (max 50 characters).
          </p>
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="skill-description">
            Description (optional)
          </label>
          <textarea
            className={fieldClasses}
            id="skill-description"
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder="Briefly describe what this skill covers"
            rows={3}
            value={form.description ?? ""}
            maxLength={700}
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="skill-aliases">
            Aliases (optional)
          </label>
          <input
            className={fieldClasses}
            id="skill-aliases"
            onChange={(event) => {
              const aliases = event.target.value
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean);
              updateForm("aliases", aliases);
            }}
            placeholder="JS Arrays, Array Methods, etc. (comma-separated)"
            value={Array.isArray(form.aliases) ? form.aliases.join(", ") : ""}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Alternative names or abbreviations for this skill (comma-separated, max 50 chars each).
          </p>
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="skill-difficulty">
            Difficulty (optional)
          </label>
          <select
            className={fieldClasses}
            id="skill-difficulty"
            onChange={(event) =>
              updateForm("difficulty", event.target.value as Difficulty || undefined)
            }
            value={form.difficulty || ""}
          >
            <option value="">Select difficulty</option>
            {difficultyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {errorMessage && (
          <p className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="rounded-md border border-success/40 bg-success/5 px-3 py-2 text-sm text-success">
            {successMessage}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={handleClose}
            type="button"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Creating..." : "Create skill"}
          </button>
        </div>
      </form>
    </InstructorModal>
  );
}