"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Search } from "lucide-react";
import { Toast } from "@/components/ui/toast";

import {
  createInstructorSkill,
  deleteInstructorSkill,
  getInstructorCourseSkills,
  updateInstructorSkill,
} from "../api/instructor-skill-api";
import type { CreateSkillPayload, Difficulty, Skill } from "../types/instructor-skill";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const difficultyColors: Record<Difficulty, string> = {
  EASY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  HARD: "border-rose-500/30 bg-rose-500/10 text-rose-600",
};

type SkillCreateForm = {
  canonicalName: string;
  description: string;
  difficulty: Difficulty;
  aliases: string;
};

export function InstructorCourseSkillsPage({ courseId }: { courseId: string }) {
  const { accessToken, status } = useAuth();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<SkillCreateForm>({
    canonicalName: "",
    description: "",
    difficulty: "MEDIUM",
    aliases: "",
  });

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<SkillCreateForm>({
    canonicalName: "",
    description: "",
    difficulty: "MEDIUM",
    aliases: "",
  });

  const [deletingSkill, setDeletingSkill] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const query = searchQuery.toLowerCase().trim();
    return skills.filter(
      (skill) =>
        skill.canonicalName.toLowerCase().includes(query) ||
        skill.description?.toLowerCase().includes(query) ||
        skill.aliases?.some((alias) => alias.toLowerCase().includes(query)),
    );
  }, [skills, searchQuery]);

  const showSuccess = (message: string) => {
    setError("");
    setSuccessMessage(message);
  };

  const showError = (message: string) => {
    setSuccessMessage("");
    setError(message);
  };

  async function fetchSkills() {
    if (!accessToken || status !== "authenticated") return;

    try {
      setLoading(true);
      const data = await getInstructorCourseSkills(courseId, accessToken);
      setSkills(data);
    } catch (loadError) {
      showError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load skills.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && accessToken) {
      void fetchSkills();
    }
  }, [accessToken, status, courseId]);

  async function handleCreateSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || status !== "authenticated") return;

    const { canonicalName, description, difficulty, aliases } = createForm;

    if (!canonicalName || canonicalName.trim().length < 3) {
      setCreateError("Skill name must be at least 3 characters.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");

    try {
      await createInstructorSkill(
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
      setCreateModalOpen(false);
      showSuccess("Skill created successfully.");
      await fetchSkills();
    } catch (createError) {
      setCreateError(
        createError instanceof Error
          ? createError.message
          : "Failed to create skill.",
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdateSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingSkill || !accessToken || status !== "authenticated") return;

    const { canonicalName, description, difficulty, aliases } = editForm;

    if (!canonicalName || canonicalName.trim().length < 3) {
      setEditError("Skill name must be at least 3 characters.");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      await updateInstructorSkill(
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
        editingSkill.id,
        accessToken,
      );

      setEditingSkill(null);
      showSuccess("Skill updated successfully.");
      await fetchSkills();
    } catch (updateError) {
      setEditError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update skill.",
      );
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteSkill() {
    if (!deletingSkill || !accessToken || status !== "authenticated") return;

    setDeleteLoading(true);

    try {
      await deleteInstructorSkill(courseId, deletingSkill, accessToken);
      setDeletingSkill(null);
      showSuccess("Skill deleted successfully.");
      await fetchSkills();
    } catch (deleteError) {
      showError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete skill.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  function openEditModal(skill: Skill) {
    setEditingSkill(skill);
    setEditForm({
      canonicalName: skill.canonicalName,
      description: skill.description ?? "",
      difficulty: skill.difficulty,
      aliases: skill.aliases?.join(", ") ?? "",
    });
    setEditError("");
  }

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="h-24 w-full rounded-lg border border-border bg-card" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-40 w-full rounded-lg border border-border bg-card"
            key={index}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Skills Management</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Manage the skills taught in this course. Skills can be attached to
              lessons and assessments.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
            onClick={() => {
              setCreateForm({ canonicalName: "", description: "", difficulty: "MEDIUM", aliases: "" });
              setCreateError("");
              setCreateModalOpen(true);
            }}
            type="button"
          >
            Add Skill
          </button>
        </div>

        <Toast
          key={successMessage ?? error ?? ""}
          error={error}
          successMessage={successMessage}
        />

        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 pl-10"
              placeholder="Search skills by name, description, or aliases..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <span className="shrink-0 self-center rounded-md border border-border bg-surface-pearl px-3 py-1 text-sm font-semibold">
            {filteredSkills.length} / {skills.length} skills
          </span>
        </div>

        {filteredSkills.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-surface-pearl px-5 py-14 text-center">
            {searchQuery ? (
              <>
                <p className="text-lg font-semibold">No skills found</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  Try adjusting your search or{" "}
                  <button
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    clear the filter
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">No skills yet</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  Create your first skill to start defining what learners will
                  master in this course.
                </p>
                <button
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
                  onClick={() => {
                    setCreateForm({ canonicalName: "", description: "", difficulty: "MEDIUM", aliases: "" });
                    setCreateError("");
                    setCreateModalOpen(true);
                  }}
                  type="button"
                >
                  Create Skill
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{skill.canonicalName}</p>
                    <Badge
                      variant="action"
                      className={difficultyColors[skill.difficulty]}
                    >
                      {skill.difficulty}
                    </Badge>
                    {skill.isActive ? (
                      <Badge variant="action">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </div>
                  {skill.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {skill.description}
                    </p>
                  )}
                  {skill.aliases?.length && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {skill.aliases.slice(0, 5).map((alias) => (
                        <Badge key={alias} variant="neutral" className="text-xs">
                          {alias}
                        </Badge>
                      ))}
                      {skill.aliases.length > 5 && (
                        <Badge variant="neutral" className="text-xs">
                          +{skill.aliases.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Created: {new Date(skill.createdAt).toLocaleDateString()}
                    {skill.updatedAt && (
                      <> · Updated: {new Date(skill.updatedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                    onClick={() => openEditModal(skill)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-danger/40 bg-card text-danger px-3 text-sm font-semibold transition-colors hover:bg-danger/10"
                    onClick={() => setDeletingSkill(skill.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InstructorModal
        onClose={() => setCreateModalOpen(false)}
        open={createModalOpen}
        title="Create Skill"
      >
        <form className="grid gap-3" onSubmit={handleCreateSkill}>
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
              value={createForm.canonicalName}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, canonicalName: event.target.value }))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              3 to 50 characters. Must be unique within the course.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Description (optional)</label>
            <textarea
              className={fieldClasses}
              maxLength={700}
              placeholder="What does this skill cover?"
              rows={2}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Difficulty</label>
            <select
              className={fieldClasses}
              value={createForm.difficulty}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))
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
              value={createForm.aliases}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, aliases: event.target.value }))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated alternative names for this skill.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
              onClick={() => setCreateModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary-focus"
              disabled={
                !createForm.canonicalName.trim() || createForm.canonicalName.trim().length < 3 || createLoading
              }
              type="submit"
            >
              {createLoading ? "Creating..." : "Create Skill"}
            </button>
          </div>
        </form>
      </InstructorModal>

      {editingSkill && (
        <InstructorModal
          onClose={() => setEditingSkill(null)}
          open={true}
          title={`Edit "${editingSkill.canonicalName}"`}
        >
          <form className="grid gap-3" onSubmit={handleUpdateSkill}>
            {editError ? (
              <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {editError}
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
                value={editForm.canonicalName}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, canonicalName: event.target.value }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                3 to 50 characters. Must be unique within the course.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Description (optional)</label>
              <textarea
                className={fieldClasses}
                maxLength={700}
                placeholder="What does this skill cover?"
                rows={2}
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Difficulty</label>
              <select
                className={fieldClasses}
                value={editForm.difficulty}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))
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
                value={editForm.aliases}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, aliases: event.target.value }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma-separated alternative names for this skill.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                onClick={() => setEditingSkill(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary-focus"
                disabled={
                  !editForm.canonicalName.trim() || editForm.canonicalName.trim().length < 3 || editLoading
                }
                type="submit"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </InstructorModal>
      )}

      {deletingSkill && (
        <InstructorModal
          onClose={() => setDeletingSkill(null)}
          open={true}
          title="Delete Skill"
        >
          <p>
            Are you sure you want to delete this skill? This action cannot be
            undone. Skills attached to lessons or assessment questions cannot be
            deleted until they are detached.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
              disabled={deleteLoading}
              onClick={() => setDeletingSkill(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleteLoading}
              onClick={handleDeleteSkill}
              type="button"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </InstructorModal>
      )}
    </div>
  );
}