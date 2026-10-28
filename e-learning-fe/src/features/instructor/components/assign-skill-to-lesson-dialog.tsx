"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  createInstructorSkill,
  suggestInstructorCourseSkills,
} from "../api/instructor-skill-api";
import { InstructorModal } from "./instructor-modal";
import { InstructorStatusMessage } from "./instructor-modal";
import type {
  Skill,
  SuggestSkillResult,
  SuggestSkillVariables,
} from "../types/instructor-skill";

type Tab = "browse" | "create";

type AssignSkillToLessonDialogProps = {
  courseId: string;
  lessonTitle: string;
  assignedSkills: Skill[];
  onClose: () => void;
  onAssign: (skill: Skill) => void;
};

const DEBOUNCE_MS = 300;
const MIN_CANONICAL_NAME_LENGTH = 3;

const difficultyOptions: { value: Skill["difficulty"]; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

type SkillCreateForm = {
  canonicalName: string;
  description: string;
  difficulty: Skill["difficulty"];
  aliases: string;
};

function toSkill(result: SuggestSkillResult): Skill {
  return {
    id: result.id,
    canonicalName: result.canonicalName,
    description: result.description,
    aliases: result.aliases,
    parentId: null,
    level: 0,
    difficulty: "MEDIUM",
    isActive: true,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
  };
}

export function AssignSkillToLessonDialog({
  courseId,
  lessonTitle,
  assignedSkills,
  onClose,
  onAssign,
}: AssignSkillToLessonDialogProps) {
  const { accessToken, status } = useAuth();
  const [tab, setTab] = useState<Tab>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestSkillResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<SkillCreateForm>({
    canonicalName: "",
    description: "",
    difficulty: "MEDIUM",
    aliases: "",
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignedSkillIds = useMemo(
    () => new Set(assignedSkills.map((skill) => skill.id)),
    [assignedSkills],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const displayedSuggestions = searchQuery.trim().length > 0 ? suggestions : [];

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    if (!searchQuery.trim()) return;

    debounceTimer.current = setTimeout(async () => {
      if (!accessToken || status !== "authenticated") return;
      if (!searchQuery.trim()) return;

      setSuggestionsLoading(true);
      setSuggestionsError("");

      try {
        const variables: SuggestSkillVariables = {
          keywords: [searchQuery.trim()],
          limit: 10,
        };
        const results = await suggestInstructorCourseSkills(
          courseId,
          variables,
          accessToken,
        );
        setSuggestions(results);
      } catch (error) {
        setSuggestionsError(
          error instanceof Error
            ? error.message
            : "Failed to load skill suggestions.",
        );
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [searchQuery, courseId, accessToken, status]);
  const handleAssign = useCallback(
    async (skill: Skill) => {
      if (assignedSkillIds.has(skill.id)) return;
      onAssign(skill);
    },
    [assignedSkillIds, onAssign],
  );

  const handleCreateAndAssign = useCallback(async () => {
    if (!accessToken || status !== "authenticated") return;

    const { canonicalName, description, difficulty, aliases } = createForm;

    if (!canonicalName || canonicalName.trim().length < MIN_CANONICAL_NAME_LENGTH) {
      setCreateError(
        `Skill name must be at least ${MIN_CANONICAL_NAME_LENGTH} characters.`,
      );
      return;
    }

    setCreateLoading(true);
    setCreateError("");

    try {
      const skill = await createInstructorSkill(
        {
          courseId,
          canonicalName: canonicalName.trim(),
          description: description.trim() || null,
          aliases: aliases
            .split(",")
            .map((alias) => alias.trim())
            .filter((alias) => alias.length > 0),
          difficulty,
        },
        accessToken,
      );

      onAssign(skill);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Failed to create skill.",
      );
    } finally {
      setCreateLoading(false);
    }
  }, [accessToken, status, courseId, createForm, onAssign]);

  const isCreateValid =
    createForm.canonicalName.trim().length >= MIN_CANONICAL_NAME_LENGTH;

  const tabClasses = (active: Tab) =>
    `inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors ${
      tab === active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
    }`;

  return (
    <InstructorModal
      onClose={onClose}
      open={true}
      title={`Assign skills to "${lessonTitle}"`}
    >
      <div className="text-foreground">
        <div className="mt-3 grid gap-3">
            <div className="flex gap-1">
              <button
                className={tabClasses("browse")}
                onClick={() => setTab("browse")}
                type="button"
              >
                Browse skills
              </button>
              <button
                className={tabClasses("create")}
                onClick={() => setTab("create")}
                type="button"
              >
                Create new skill
              </button>
            </div>

            {(assignedSkills.length > 0 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Already assigned
                </p>
                <div className="flex flex-wrap gap-2">
                  {assignedSkills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="action"
                      title={skill.canonicalName}
                    >
                      {skill.canonicalName}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null)}

            {tab === "browse" ? (
              <BrowseTab
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                suggestions={displayedSuggestions}
                suggestionsLoading={suggestionsLoading}
                suggestionsError={suggestionsError}
                assignedSkillIds={assignedSkillIds}
                onAssign={handleAssign}
              />
            ) : (
              <CreateTab
                createForm={createForm}
                setCreateForm={(patch) =>
                  setCreateForm((prev) => ({ ...prev, ...patch }))
                }
                createError={createError}
                createLoading={createLoading}
                difficultyOptions={difficultyOptions}
                onCreateAndAssign={handleCreateAndAssign}
                isValid={isCreateValid}
              />
            )}
          </div>
        </div>
    </InstructorModal>
  );
}

type BrowseTabProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  suggestions: SuggestSkillResult[];
  suggestionsLoading: boolean;
  suggestionsError: string;
  assignedSkillIds: Set<string>;
  onAssign: (skill: Skill) => void;
};

function BrowseTab({
  searchQuery,
  setSearchQuery,
  suggestions,
  suggestionsLoading,
  suggestionsError,
  assignedSkillIds,
  onAssign,
}: BrowseTabProps) {
  return (
    <div className="grid gap-3">
      <div className="relative">
        <input
          className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 pl-10"
          placeholder="Search skills (e.g. JavaScript, React)..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {suggestionsLoading ? (
          <p className="mt-1 text-xs text-primary">Searching skills...</p>
        ) : null}
      </div>

      {suggestionsError ? (
        <InstructorStatusMessage variant="error">
          {suggestionsError}
        </InstructorStatusMessage>
      ) : null}

      {suggestions.length === 0 && searchQuery.trim().length > 0 && !suggestionsLoading ? (
        <p className="text-xs text-muted-foreground">
          No skills found. Try another search or create a new skill.
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="grid gap-2">
          {suggestions.map((skill) => {
            const alreadyAssigned = assignedSkillIds.has(skill.id);
            return (
              <div
                key={skill.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-semibold">
                    {skill.canonicalName}
                  </p>
                  {skill.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                  ) : null}
                  {skill.aliases?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {skill.aliases.map((alias) => (
                        <Badge key={alias} variant="neutral">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {alreadyAssigned ? (
                    <Badge variant="neutral">Assigned</Badge>
                  ) : (
                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-focus"
                      disabled={alreadyAssigned}
                      onClick={() => onAssign(toSkill(skill))}
                      type="button"
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type CreateTabProps = {
  createForm: SkillCreateForm;
  setCreateForm: (patch: Partial<SkillCreateForm>) => void;
  createError: string;
  createLoading: boolean;
  difficultyOptions: { value: Skill["difficulty"]; label: string }[];
  onCreateAndAssign: () => void;
  isValid: boolean;
};

function CreateTab({
  createForm,
  setCreateForm,
  createError,
  createLoading,
  difficultyOptions,
  onCreateAndAssign,
  isValid,
}: CreateTabProps) {
  const { canonicalName, description, difficulty, aliases } = createForm;

  return (
    <div className="grid gap-3">
      {createError ? (
        <InstructorStatusMessage variant="error">{createError}</InstructorStatusMessage>
      ) : null}

      <div>
        <label className="block text-xs font-semibold mb-1">Skill name</label>
        <input
          className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20"
          maxLength={50}
          minLength={3}
          placeholder="e.g. JavaScript fundamentals"
          required
          value={canonicalName}
          onChange={(event) =>
            setCreateForm({ canonicalName: event.target.value })
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">
          3 to 50 characters. Must be unique within the course.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">Description (optional)</label>
        <textarea
          className="min-h-[80px] w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20"
          maxLength={700}
          placeholder="What does this skill cover?"
          rows={2}
          value={description}
          onChange={(event) =>
            setCreateForm({ description: event.target.value })
          }
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">Difficulty</label>
        <select
          className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20"
          value={difficulty}
          onChange={(event) =>
            setCreateForm({ difficulty: event.target.value as Skill["difficulty"] })
          }
        >
          {difficultyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">Aliases (optional)</label>
        <input
          className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20"
          placeholder="js, react, frontend"
          value={aliases}
          onChange={(event) => setCreateForm({ aliases: event.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Comma-separated alternative names for this skill.
        </p>
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary-focus"
        disabled={!isValid || createLoading}
        onClick={onCreateAndAssign}
        type="button"
      >
        {createLoading ? "Creating..." : "Create & assign"}
      </button>
    </div>
  );
}

