"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPublicCategoryTree } from "@/features/courses/api/course-api";

import {
  deleteInstructorDraftCourse,
  getInstructorCourses,
  submitInstructorCourseForReview,
  updateInstructorCourse,
} from "../api/instructor-course-api";
import { getUploadSignature } from "../api/instructor-lesson-file-api";
import type { CourseLevel, InstructorCourse } from "../types/instructor-course";
import {
  buildCategoryOptions,
  formatCategoryLabel,
  type CategoryOption,
} from "../utils/category-options";
import {
  formatCourseStatusLabel,
  formatLevelLabel,
  getCourseStatusBadgeVariant,
  getLockedCourseMessage,
  isCourseEditable,
} from "../utils/course-status";
import {
  formatVndInput,
  getErrorMessage,
  onlyDigits,
  parseVndInput,
} from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 disabled:bg-muted disabled:text-muted-foreground";

const courseLevels: CourseLevel[] = [
  "ADVANCE",
  "ALL_LEVELS",
  "BEGINNER",
  "INTERMEDIATE",
];

const languageOptions = [
  "English",
  "Vietnamese",
  "Chinese",
  "Japanese",
  "Korean",
  "French",
  "Spanish",
];

type EditableCourse = InstructorCourse & { id: string };

export function EditCourseForm() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const router = useRouter();
  const { accessToken, status } = useAuth();

  const [course, setCourse] = useState<EditableCourse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [whatYouWillLearnText, setWhatYouWillLearnText] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [level, setLevel] = useState<CourseLevel>("BEGINNER");
  const [price, setPrice] = useState("");
  const [language, setLanguage] = useState("");
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [categoryId, setCategoryId] = useState("");

  const [categoryTree, setCategoryTree] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingThumbnail, setPendingThumbnail] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    variant: "error" | "success";
  } | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const priceNumber = useMemo(() => parseVndInput(price), [price]);
  const selectedCategory = useMemo(
    () => categoryTree.find((option) => option.id === categoryId),
    [categoryId, categoryTree],
  );
  const editable = isCourseEditable(course?.status);
  const lockedMessage = getLockedCourseMessage(course?.status);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let isMounted = true;

    Promise.all([
      getInstructorCourses({ limit: 100 }, accessToken),
      getPublicCategoryTree().catch(() => []),
    ])
      .then(([coursesResponse, tree]) => {
        if (!isMounted) return;

        const found = (coursesResponse.data ?? []).find(
          (item) => item.id === courseId,
        );

        if (!found) {
          setLoadError("Course not found or no longer available.");
          return;
        }

        setCourse(found);
        setTitle(found.title ?? "");
        setShortDescription(found.shortDescription ?? "");
        setDescription(found.description ?? "");
        setWhatYouWillLearnText((found.whatYouWillLearn ?? []).join("\n"));
        setRequirementsText((found.requirements ?? []).join("\n"));
        setLevel(found.level ?? "BEGINNER");
        setPrice(
          found.price !== undefined && found.price !== null
            ? formatVndInput(String(found.price))
            : "",
        );
        setLanguage(found.language ?? "");
        setCertificateEnabled(Boolean(found.certificateEnabled));
        setCategoryId(found.categories?.[0]?.id ?? "");
        setCategoryTree(buildCategoryOptions(tree));
        setCategoryLoading(false);
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getErrorMessage(error, "Unable to load the course."));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, courseId, status]);

  function showMessage(text: string, variant: "error" | "success") {
    setMessage({ text, variant });
  }

  function splitLines(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function handlePriceChange(value: string) {
    setPrice(formatVndInput(onlyDigits(value)));
  }

  function handleThumbnailSelected(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image file.", "error");
      return;
    }

    if (pendingThumbnail) {
      URL.revokeObjectURL(pendingThumbnail.previewUrl);
    }

    setPendingThumbnail({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelPendingThumbnail() {
    if (pendingThumbnail) {
      URL.revokeObjectURL(pendingThumbnail.previewUrl);
    }

    setPendingThumbnail(null);
  }

  async function uploadThumbnail() {
    if (!pendingThumbnail || !course || !accessToken) return;

    try {
      setIsUploadingThumbnail(true);

      const signature = await getUploadSignature(
        { entityId: course.id, entityType: "course", resourceType: "image" },
        accessToken,
      );

      const uploadForm = new FormData();

      uploadForm.append("file", pendingThumbnail.file);
      uploadForm.append("api_key", signature.apiKey);
      uploadForm.append("timestamp", String(signature.timestamp));
      uploadForm.append("signature", signature.signature);

      if (signature.folder) {
        uploadForm.append("folder", signature.folder);
      }

      if (signature.uploadPreset) {
        uploadForm.append("upload_preset", signature.uploadPreset);
      }

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        { body: uploadForm, method: "POST" },
      );

      const uploadData = (await uploadResponse.json().catch(() => null)) as {
        secure_url?: string;
      } | null;

      if (!uploadResponse.ok || !uploadData?.secure_url) {
        throw new Error("Thumbnail upload failed. Please try again.");
      }

      const updatedCourse = await updateInstructorCourse(
        course.id,
        { thumbnailUrl: uploadData.secure_url },
        accessToken,
      );

      setCourse({ ...course, ...updatedCourse });
      cancelPendingThumbnail();
      showMessage("Thumbnail updated.", "success");
    } catch (uploadError) {
      showMessage(
        getErrorMessage(uploadError, "Failed to upload the thumbnail."),
        "error",
      );
    } finally {
      setIsUploadingThumbnail(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!course || !accessToken) return;

    if (!editable) {
      showMessage(lockedMessage, "error");
      return;
    }

    if (!categoryId) {
      showMessage("Please choose a category.", "error");
      return;
    }

    if (!selectedCategory?.isLeaf) {
      showMessage(
        "Please choose a child category, not a parent group.",
        "error",
      );
      return;
    }

    if (!language) {
      showMessage("Please choose a language.", "error");
      return;
    }

    try {
      setIsSaving(true);

      const updatedCourse = await updateInstructorCourse(
        course.id,
        {
          categoryIds: [categoryId],
          certificateEnabled,
          description: description.trim() || undefined,
          language,
          level,
          price: priceNumber,
          requirements: splitLines(requirementsText),
          shortDescription: shortDescription.trim(),
          title: title.trim(),
          whatYouWillLearn: splitLines(whatYouWillLearnText),
        },
        accessToken,
      );

      setCourse({ ...course, ...updatedCourse });
      showMessage("Course information saved.", "success");
    } catch (saveError) {
      showMessage(
        getErrorMessage(saveError, "Failed to save the course."),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmSubmitForReview() {
    if (!course || !accessToken) return;

    try {
      setIsSubmittingReview(true);

      await submitInstructorCourseForReview(course.id, accessToken);
      setCourse({ ...course, status: "PENDING_REVIEW" });
      setConfirmSubmitOpen(false);
      showMessage("Course submitted for review.", "success");
    } catch (submitError) {
      setConfirmSubmitOpen(false);
      showMessage(
        getErrorMessage(submitError, "Failed to submit the course for review."),
        "error",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function confirmDeleteCourse() {
    if (!course || !accessToken) return;

    try {
      setIsDeleting(true);

      await deleteInstructorDraftCourse(course.id, accessToken);
      router.push("/instructor/courses");
    } catch (deleteError) {
      setConfirmDeleteOpen(false);
      showMessage(
        getErrorMessage(deleteError, "Failed to delete the course."),
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="h-6 w-1/3 rounded-md bg-muted" />
        <div className="mt-4 h-4 w-full rounded-md bg-muted" />
        <div className="mt-2 h-4 w-5/6 rounded-md bg-muted" />
        <div className="mt-6 h-64 w-full rounded-md bg-muted" />
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
        <p className="text-lg font-semibold">Course unavailable</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {loadError ?? "Course not found or no longer available."}
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">Edit course</h2>
              <Badge variant={getCourseStatusBadgeVariant(course.status)}>
                {formatCourseStatusLabel(course.status)}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Update the course information. Curriculum and assessments are
              managed on their own pages.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              href={`/instructor/courses/${course.id}/preview`}
            >
              Preview
            </a>
            <a
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              href={`/instructor/courses/${course.id}/curriculum`}
            >
              Curriculum
            </a>
            <a
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              href={`/instructor/courses/${course.id}/assessments`}
            >
              Assessments
            </a>
          </div>
        </div>

        {!editable ? (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
            {lockedMessage}
          </p>
        ) : null}

        {message ? (
          <p
            className={`mt-4 rounded-md px-4 py-3 text-sm leading-6 ${
              message.variant === "success"
                ? "border border-success/30 bg-success/10 text-success"
                : "border border-danger/30 bg-danger/10 text-danger"
            }`}
            role={message.variant === "success" ? "status" : "alert"}
          >
            {message.text}
          </p>
        ) : null}

        <form className="mt-6 grid gap-5" onSubmit={handleSave}>
          <div>
            <label className="text-sm font-medium" htmlFor="edit-title">
              Course title
            </label>
            <input
              className={fieldClasses}
              disabled={!editable}
              id="edit-title"
              maxLength={255}
              minLength={3}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="edit-short-desc">
              Short description
            </label>
            <textarea
              className={fieldClasses}
              disabled={!editable}
              id="edit-short-desc"
              maxLength={500}
              minLength={10}
              onChange={(event) => setShortDescription(event.target.value)}
              required
              rows={3}
              value={shortDescription}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="edit-description">
              Description
            </label>
            <textarea
              className={fieldClasses}
              disabled={!editable}
              id="edit-description"
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              value={description}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="edit-learn">
                What you will learn (one item per line)
              </label>
              <textarea
                className={fieldClasses}
                disabled={!editable}
                id="edit-learn"
                onChange={(event) =>
                  setWhatYouWillLearnText(event.target.value)
                }
                rows={5}
                value={whatYouWillLearnText}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="edit-requirements"
              >
                Requirements (one item per line)
              </label>
              <textarea
                className={fieldClasses}
                disabled={!editable}
                id="edit-requirements"
                onChange={(event) => setRequirementsText(event.target.value)}
                rows={5}
                value={requirementsText}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="edit-level">
                Level
              </label>
              <select
                className={fieldClasses}
                disabled={!editable}
                id="edit-level"
                onChange={(event) =>
                  setLevel(event.target.value as CourseLevel)
                }
                value={level}
              >
                {courseLevels.map((item) => (
                  <option key={item} value={item}>
                    {formatLevelLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="edit-category">
                Category
              </label>
              <select
                className={fieldClasses}
                disabled={!editable || categoryLoading}
                id="edit-category"
                onChange={(event) => setCategoryId(event.target.value)}
                required
                value={categoryId}
              >
                <option value="">
                  {categoryLoading ? "Loading..." : "Choose category"}
                </option>
                {categoryTree.map((category) => (
                  <option
                    disabled={!category.isLeaf}
                    key={category.id}
                    value={category.id}
                  >
                    {formatCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="edit-price">
                Price (VND)
              </label>
              <input
                className={fieldClasses}
                disabled={!editable}
                id="edit-price"
                inputMode="numeric"
                onChange={(event) => handlePriceChange(event.target.value)}
                placeholder="100.000"
                value={price}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Leave empty for free.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="edit-language">
                Language
              </label>
              <select
                className={fieldClasses}
                disabled={!editable}
                id="edit-language"
                onChange={(event) => setLanguage(event.target.value)}
                required
                value={language}
              >
                <option value="">Choose language</option>
                {languageOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              checked={certificateEnabled}
              disabled={!editable}
              onChange={(event) => setCertificateEnabled(event.target.checked)}
              type="checkbox"
            />
            Enable certificate
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-base font-semibold transition-colors hover:bg-muted"
              href="/instructor/courses"
            >
              Back
            </a>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !editable}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <aside className="grid content-start gap-5">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Course thumbnail</h3>
          <div className="mt-3 overflow-hidden rounded-md border border-border bg-muted">
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${course.title} thumbnail`}
                className="aspect-video w-full object-cover"
                src={course.thumbnailUrl}
              />
            ) : (
              <div className="grid aspect-video place-items-center text-sm text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <label
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
            htmlFor="edit-thumbnail"
          >
            Choose image
          </label>
          <input
            accept="image/*"
            className="hidden"
            disabled={!editable}
            id="edit-thumbnail"
            onChange={(event) =>
              handleThumbnailSelected(event.target.files?.[0] ?? null)
            }
            type="file"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            16:9 images work best. Uploads go straight to the course card.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Course card preview</h3>
          <div className="mt-3 overflow-hidden rounded-md border border-border">
            <div className="grid aspect-video place-items-center overflow-hidden bg-muted text-sm text-muted-foreground">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={course.thumbnailUrl}
                />
              ) : (
                "No image"
              )}
            </div>

            <div className="p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge>{formatLevelLabel(level)}</Badge>
                {language ? <Badge>{language}</Badge> : null}
                {selectedCategory ? (
                  <Badge>{selectedCategory.name}</Badge>
                ) : null}
              </div>

              <p className="line-clamp-2 font-semibold">
                {title || course.title || "Untitled course"}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {shortDescription ||
                  course.shortDescription ||
                  "No short description."}
              </p>
              <p className="mt-4 text-sm font-semibold">
                {priceNumber !== undefined
                  ? `${priceNumber.toLocaleString("vi-VN")} VND`
                  : "Free"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 border-t border-border pt-4">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmittingReview}
              onClick={() => setConfirmSubmitOpen(true)}
              type="button"
            >
              {isSubmittingReview ? "Submitting..." : "Submit for Review"}
            </button>

            {course.status === "DRAFT" ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteOpen(true)}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete Draft"}
              </button>
            ) : null}
          </div>
        </div>
      </aside>
      <InstructorModal
        onClose={cancelPendingThumbnail}
        open={pendingThumbnail !== null}
        title="Preview thumbnail"
      >
        {pendingThumbnail ? (
          <div className="grid gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={pendingThumbnail.file.name}
              className="aspect-video w-full rounded-md border border-border object-cover"
              src={pendingThumbnail.previewUrl}
            />
            <p className="break-all text-xs">{pendingThumbnail.file.name}</p>
            <div className="flex justify-end gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                disabled={isUploadingThumbnail}
                onClick={cancelPendingThumbnail}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUploadingThumbnail}
                onClick={uploadThumbnail}
                type="button"
              >
                {isUploadingThumbnail ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        ) : null}
      </InstructorModal>
      <InstructorModal
        onClose={() => setConfirmSubmitOpen(false)}
        open={confirmSubmitOpen}
        title="Submit for review"
      >
        <p>
          Submit this course to the reviewer? Course information will be locked
          while the review is in progress.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setConfirmSubmitOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground"
            disabled={isSubmittingReview}
            onClick={confirmSubmitForReview}
            type="button"
          >
            {isSubmittingReview ? "Submitting..." : "Submit"}
          </button>
        </div>
      </InstructorModal>

      <InstructorModal
        onClose={() => setConfirmDeleteOpen(false)}
        open={confirmDeleteOpen}
        title="Delete draft course"
      >
        <p>
          Are you sure you want to delete this draft? This action cannot be
          undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            disabled={isDeleting}
            onClick={() => setConfirmDeleteOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground"
            disabled={isDeleting}
            onClick={confirmDeleteCourse}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </InstructorModal>
    </div>
  );
}
