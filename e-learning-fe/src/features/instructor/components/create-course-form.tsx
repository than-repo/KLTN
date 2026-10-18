"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPublicCategoryTree } from "@/features/courses/api/course-api";

import { createInstructorCourse } from "../api/instructor-course-api";
import type { CourseLevel } from "../types/instructor-course";
import {
  buildCategoryOptions,
  formatCategoryLabel,
  type CategoryOption,
} from "../utils/category-options";
import { formatLevelLabel } from "../utils/course-status";
import {
  formatVndInput,
  getErrorMessage,
  onlyDigits,
  parseVndInput,
} from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

const levels: CourseLevel[] = [
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

export function CreateCourseForm() {
  const router = useRouter();
  const { accessToken, status } = useAuth();

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<CourseLevel>("BEGINNER");
  const [price, setPrice] = useState("");
  const [language, setLanguage] = useState("");
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [categoryTree, setCategoryTree] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const priceNumber = useMemo(() => parseVndInput(price), [price]);
  const selectedCategory = useMemo(
    () => categoryTree.find((option) => option.id === categoryId),
    [categoryId, categoryTree],
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let isMounted = true;

    getPublicCategoryTree()
      .then((tree) => {
        if (isMounted) {
          setCategoryTree(buildCategoryOptions(tree));
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setCategoryTree([]);
          setErrorMessage(
            getErrorMessage(loadError, "Failed to load categories."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setCategoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [status]);

  function handlePriceChange(value: string) {
    setPrice(formatVndInput(onlyDigits(value)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryId) {
      setErrorMessage("Please choose a category.");
      return;
    }

    if (!selectedCategory?.isLeaf) {
      setErrorMessage("Please choose a child category, not a parent group.");
      return;
    }

    if (!language) {
      setErrorMessage("Please choose a language.");
      return;
    }

    if (priceNumber !== undefined && priceNumber < 0) {
      setErrorMessage("Price must be greater than or equal to 0.");
      return;
    }

    if (!accessToken) {
      setErrorMessage("Your session is not ready. Please sign in again.");
      return;
    }

    try {
      setLoading(true);

      const createdCourse = await createInstructorCourse(
        {
          certificateEnabled,
          categoryIds: [categoryId],
          description: description.trim() || undefined,
          language,
          level,
          price: priceNumber,
          shortDescription: shortDescription.trim(),
          title: title.trim(),
        },
        accessToken,
      );

      router.push(`/instructor/courses/${createdCourse.id}/curriculum`);
    } catch (createError) {
      setErrorMessage(getErrorMessage(createError, "Failed to create course."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold">Create Draft Course</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Create the basic information first. After that, you can add sections,
        lessons, and assessments.
      </p>

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium" htmlFor="course-title">
            Course title
          </label>
          <input
            className={fieldClasses}
            id="course-title"
            maxLength={255}
            minLength={3}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="NestJS Masterclass"
            required
            value={title}
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="course-short-desc">
            Short description
          </label>
          <textarea
            className={fieldClasses}
            id="course-short-desc"
            maxLength={500}
            minLength={10}
            onChange={(event) => setShortDescription(event.target.value)}
            placeholder="Learn how to build production-ready APIs with NestJS."
            required
            rows={3}
            value={shortDescription}
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="course-description">
            Description
          </label>
          <textarea
            className={fieldClasses}
            id="course-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Full course description..."
            rows={6}
            value={description}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="course-level">
              Level
            </label>
            <select
              className={fieldClasses}
              id="course-level"
              onChange={(event) => setLevel(event.target.value as CourseLevel)}
              value={level}
            >
              {levels.map((item) => (
                <option key={item} value={item}>
                  {formatLevelLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="course-category">
              Category
            </label>
            <select
              className={fieldClasses}
              disabled={categoryLoading}
              id="course-category"
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
            <p className="mt-2 text-xs text-muted-foreground">
              Parent groups are disabled. Please choose a child category.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="course-price">
              Price (VND)
            </label>
            <input
              className={fieldClasses}
              id="course-price"
              inputMode="numeric"
              onChange={(event) => handlePriceChange(event.target.value)}
              placeholder="100.000"
              value={price}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Enter the price in Vietnamese dong. Example: 100.000. Leave empty
              for free.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="course-language">
              Language
            </label>
            <select
              className={fieldClasses}
              id="course-language"
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
            onChange={(event) => setCertificateEnabled(event.target.checked)}
            type="checkbox"
          />
          Enable certificate
        </label>

        <div className="flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-base font-semibold transition-colors hover:bg-muted"
            onClick={() => router.push("/instructor/courses")}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || categoryLoading}
            type="submit"
          >
            {loading ? "Creating..." : "Create Draft Course"}
          </button>
        </div>
      </form>

      <InstructorModal
        onClose={() => setErrorMessage(null)}
        open={errorMessage !== null}
        title="Something went wrong"
      >
        <p className="whitespace-pre-wrap text-danger">{errorMessage}</p>
      </InstructorModal>
    </div>
  );
}
