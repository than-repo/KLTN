"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Plus, Search, X, Check } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  createInstructorSkill,
  getInstructorCourseSkills,
  suggestInstructorCourseSkills,
} from "../api/instructor-skill-api";
import { InstructorModal } from "./instructor-modal";
import type {
  Skill,
  SuggestSkillResult,
  SuggestSkillVariables,
} from "../types/instructor-skill";

type Tab = "assigned" | "browse" | "create";

type AssignSkillToLessonDialogProps = {
  courseId: string;
  lessonTitle: string;
  assignedSkills: Skill[];
  onClose: () => void;
  onAssign: (skill: Skill) => void;
  onRemove: (skill: Skill) => void;
  onCreate?: (skill: Skill) => void;
  /** Optional: all course skills to avoid stale data. If not provided, will fetch internally. */
  allCourseSkills?: Skill[];
  /** Optional: callback to trigger refetch of course skills when needed */
  onRefreshCourseSkills?: () => void;
};

const DEBOUNCE_MS = 300;
const MIN_CANONICAL_NAME_LENGTH = 3;

const difficultyOptions: { value: Skill["difficulty"]; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const difficultyColors: Record<Skill["difficulty"], string> = {
  EASY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  HARD: "border-rose-500/30 bg-rose-500/10 text-rose-600",
};

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
  onRemove,
  allCourseSkills: allCourseSkillsProp,
  onRefreshCourseSkills,
}: AssignSkillToLessonDialogProps) {
  const { accessToken, status } = useAuth();
  const [tab, setTab] = useState<Tab>("assigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [allCourseSkills, setAllCourseSkills] = useState<Skill[]>([]);
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
  const [skillsLoading, setSkillsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use passed allCourseSkills if provided, otherwise use internal state
  const effectiveAllCourseSkills = allCourseSkillsProp ?? allCourseSkills;

  const assignedSkillIds = useMemo(
    () => new Set(assignedSkills.map((skill) => skill.id)),
    [assignedSkills],
  );

  const availableSkills = useMemo(() => {
    return effectiveAllCourseSkills.filter((skill) => !assignedSkillIds.has(skill.id));
  }, [effectiveAllCourseSkills, assignedSkillIds]);

  const displayedSuggestions = searchQuery.trim().length > 0 ? suggestions : [];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch all course skills on mount (only if not provided by parent)
  useEffect(() => {
    if (allCourseSkillsProp) return; // Parent provides skills, no need to fetch
    if (!accessToken || status !== "authenticated") return;

    async function loadSkills() {
      setSkillsLoading(true);
      try {
        const skills = await getInstructorCourseSkills(courseId, accessToken!);
        setAllCourseSkills(skills);
      } catch {
        // Ignore error, will still work with search
      } finally {
        setSkillsLoading(false);
      }
    }

    loadSkills();
  }, [accessToken, status, courseId, allCourseSkillsProp]);

  // Trigger refresh when parent requests it
  useEffect(() => {
    if (!onRefreshCourseSkills) return;
    // We don't call it directly here - parent will call it via ref or we expose a function
    // This effect is just for cleanup if needed
  }, [onRefreshCourseSkills]);

  // Debounced search for suggestions
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
    (skill: Skill) => {
      if (assignedSkillIds.has(skill.id)) return;
      onAssign(skill);
      setSearchQuery("");
      inputRef.current?.focus();
    },
    [assignedSkillIds, onAssign],
  );

  const handleRemove = useCallback(
    (skill: Skill) => {
      onRemove(skill);
    },
    [onRemove],
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

      setCreateForm({ canonicalName: "", description: "", difficulty: "MEDIUM", aliases: "" });
      onAssign(skill);
      setTab("assigned");
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
      size="xl"
    >
      <div className="text-foreground">
        <div className="mt-3 grid gap-3">
          {/* Tab Navigation */}
          <div className="flex gap-1" role="tablist" aria-label="Skill management tabs">
            <button
              role="tab"
              aria-selected={tab === "assigned"}
              className={tabClasses("assigned")}
              onClick={() => setTab("assigned")}
              type="button"
            >
              Assigned Skills
            </button>
            <button
              role="tab"
              aria-selected={tab === "browse"}
              className={tabClasses("browse")}
              onClick={() => setTab("browse")}
              type="button"
            >
              Browse Skills
            </button>
            <button
              role="tab"
              aria-selected={tab === "create"}
              className={tabClasses("create")}
              onClick={() => setTab("create")}
              type="button"
            >
              Create New Skill
            </button>
          </div>

          {/* Tab Panels */}
          {tab === "assigned" && (
            <AssignedSkillsTab
              assignedSkills={assignedSkills}
              difficultyColors={difficultyColors}
              onRemove={handleRemove}
            />
          )}

          {tab === "browse" && (
            <BrowseSkillsTab
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              suggestions={displayedSuggestions}
              availableSkills={availableSkills}
              suggestionsLoading={suggestionsLoading}
              suggestionsError={suggestionsError}
              skillsLoading={skillsLoading}
              assignedSkillIds={assignedSkillIds}
              onAssign={handleAssign}
              inputRef={inputRef}
              difficultyColors={difficultyColors}
            />
          )}

          {tab === "create" && (
            <CreateSkillTab
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

/**
 * Tab 1: Assigned Skills - Shows skills currently attached to the lesson
 */
type AssignedSkillsTabProps = {
  assignedSkills: Skill[];
  difficultyColors: Record<Skill["difficulty"], string>;
  onRemove: (skill: Skill) => void;
};

function AssignedSkillsTab({
  assignedSkills,
  difficultyColors,
  onRemove,
}: AssignedSkillsTabProps) {
  if (assignedSkills.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface-pearl p-8 text-center">
        <X className="mx-auto size-12 text-muted-foreground/50" />
        <p className="mt-3 text-lg font-semibold text-foreground">No skills assigned</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No skills assigned to this lesson yet. Switch to the "Browse Skills" or "Create New Skill" tab to add skills.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <div className="divide-y divide-border/60">
        {assignedSkills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center justify-between gap-4 py-3 min-w-0"
          >
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="font-semibold truncate max-w-[280px]">
                  {skill.canonicalName}
                </p>
                <Badge variant="action" className={difficultyColors[skill.difficulty]}>
                  {skill.difficulty}
                </Badge>
              </div>
              {skill.description && (
                <p className="truncate text-sm text-muted-foreground max-w-[350px]">
                  {skill.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <button
                className="inline-flex items-center gap-1.5 min-h-9 rounded-md border border-danger/40 bg-card text-danger px-3 text-sm font-semibold transition-colors hover:bg-danger/10"
                onClick={() => onRemove(skill)}
                type="button"
                aria-label={`Remove ${skill.canonicalName}`}
              >
                <X className="size-4" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tab 2: Browse Skills - Search and browse available skills
 */
type BrowseSkillsTabProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  suggestions: SuggestSkillResult[];
  availableSkills: Skill[];
  suggestionsLoading: boolean;
  suggestionsError: string;
  skillsLoading: boolean;
  assignedSkillIds: Set<string>;
  onAssign: (skill: Skill) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  difficultyColors: Record<Skill["difficulty"], string>;
};

function BrowseSkillsTab({
  searchQuery,
  setSearchQuery,
  suggestions,
  availableSkills,
  suggestionsLoading,
  suggestionsError,
  skillsLoading,
  assignedSkillIds,
  onAssign,
  inputRef,
  difficultyColors,
}: BrowseSkillsTabProps) {
  // Combine available skills and suggestions, deduplicate by ID
  const combinedSkills = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ skill: Skill; source: "course" | "suggestion" }> = [];

    // Add suggestions first (they match the search)
    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.id)) {
        seen.add(suggestion.id);
        result.push({ skill: toSkill(suggestion), source: "suggestion" });
      }
    }

    // Add available course skills
    for (const skill of availableSkills) {
      if (!seen.has(skill.id)) {
        seen.add(skill.id);
        result.push({ skill, source: "course" });
      }
    }

    return result;
  }, [suggestions, availableSkills]);

  const filteredSkills = searchQuery.trim().length > 0
    ? combinedSkills
    : availableSkills.map((skill) => ({ skill, source: "course" as const }));

  return (
    <div className="grid gap-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 pl-10"
          placeholder="Search skills (e.g. JavaScript, React)..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {(suggestionsLoading || skillsLoading) && (
          <p className="mt-1 text-xs text-primary">
            {suggestionsLoading ? "Searching skills..." : "Loading skills..."}
          </p>
        )}
      </div>

      {suggestionsError ? (
        <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {suggestionsError}
        </div>
      ) : null}

      {/* Empty States */}
      {filteredSkills.length === 0 && searchQuery.trim().length > 0 && !suggestionsLoading && !skillsLoading ? (
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <Search className="mx-auto size-12 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No skills found matching "{searchQuery}".
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Try another search or create a new skill.
          </p>
        </div>
      ) : null}

      {filteredSkills.length === 0 && searchQuery.trim().length === 0 && !skillsLoading ? (
        <div className="rounded-md border border-border bg-surface-pearl p-8 text-center">
          <Search className="mx-auto size-12 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No skills available. Create your first skill in the "Create New Skill" tab.
          </p>
        </div>
      ) : null}

      {/* Skills List */}
      {filteredSkills.length > 0 ? (
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="divide-y divide-border/60">
            {filteredSkills.map(({ skill, source }) => {
              const alreadyAssigned = assignedSkillIds.has(skill.id);
              const isSuggestion = source === "suggestion";

              return (
                <div
                  key={skill.id}
                  className={`flex items-center justify-between gap-4 py-3 min-w-0 transition-colors ${
                    alreadyAssigned
                      ? "bg-muted/50 opacity-60"
                      : "bg-card hover:bg-primary/5"
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="font-semibold truncate max-w-[280px]">
                        {skill.canonicalName}
                      </p>
                      <Badge variant="action" className={difficultyColors[skill.difficulty]}>
                        {skill.difficulty}
                      </Badge>
                      {isSuggestion && (
                        <Badge variant="neutral" className="text-xs">
                          Suggested
                        </Badge>
                      )}
                    </div>
                    {skill.description && (
                      <p className="truncate text-sm text-muted-foreground max-w-[350px]">
                        {skill.description}
                      </p>
                    )}
                    {skill.aliases?.length && (
                      <div className="flex flex-wrap gap-1">
                        {skill.aliases.slice(0, 3).map((alias) => (
                          <Badge key={alias} variant="neutral" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                        {skill.aliases.length > 3 && (
                          <Badge variant="neutral" className="text-xs">
                            +{skill.aliases.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {alreadyAssigned ? (
                      <button
                        className="inline-flex items-center gap-1.5 min-h-9 rounded-md border border-danger/40 bg-card text-danger px-3 text-sm font-semibold transition-colors hover:bg-danger/10"
                        onClick={() => onAssign(skill)}
                        type="button"
                        aria-label={`Remove ${skill.canonicalName}`}
                      >
                        <X className="size-4" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1.5 min-h-9 rounded-md border border-primary bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
                        onClick={() => onAssign(skill)}
                        type="button"
                        aria-label={`Add ${skill.canonicalName}`}
                      >
                        <Plus className="size-4" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Tab 3: Create New Skill - Form to create a new skill
 */
type CreateSkillTabProps = {
  createForm: SkillCreateForm;
  setCreateForm: (patch: Partial<SkillCreateForm>) => void;
  createError: string;
  createLoading: boolean;
  difficultyOptions: { value: Skill["difficulty"]; label: string }[];
  onCreateAndAssign: () => void;
  isValid: boolean;
};

function CreateSkillTab({
  createForm,
  setCreateForm,
  createError,
  createLoading,
  difficultyOptions,
  onCreateAndAssign,
  isValid,
}: CreateSkillTabProps) {
  const { canonicalName, description, difficulty, aliases } = createForm;

  const fieldClasses =
    "min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

  return (
    <div className="grid gap-4">
      {createError ? (
        <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {createError}
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-semibold mb-1">Skill name</label>
        <input
          className={fieldClasses}
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
          className={`${fieldClasses} min-h-[80px]`}
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
          className={fieldClasses}
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
          className={fieldClasses}
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