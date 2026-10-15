"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import type { PublicCourseQuery } from "../types/course";
import type { CourseCategoryGroup } from "../utils/course-data";
import { formatCourseLevel } from "../utils/course-data";
import { LanguageSearchDropdown } from "./LanguageSearchDropdown";

type CourseFiltersProps = {
  categoryGroups: CourseCategoryGroup[];
  query: PublicCourseQuery;
};

export const COURSE_CATALOG_CONTROLS_FORM_ID = "course-catalog-controls";

const inputClasses =
  "mt-2 min-h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

const levels = ["BEGINNER", "INTERMEDIATE", "ADVANCE", "ALL_LEVELS"] as const;

const sortOptions = [
  { label: "Newest", sortDirection: "desc", sortField: "publishedAt" },
  { label: "Title A-Z", sortDirection: "asc", sortField: "title" },
  { label: "Price low to high", sortDirection: "asc", sortField: "price" },
  { label: "Price high to low", sortDirection: "desc", sortField: "price" },
] as const;

export function CourseFilters({ categoryGroups, query }: CourseFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(() =>
    formatPriceInput(query.minPrice),
  );
  const [maxPrice, setMaxPrice] = useState(() =>
    formatPriceInput(query.maxPrice),
  );

  useEffect(() => {
    setMinPrice(formatPriceInput(query.minPrice));
    setMaxPrice(formatPriceInput(query.maxPrice));
  }, [query.minPrice, query.maxPrice]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    const sortValue = String(formData.get("sort") ?? "");
    const [sortField, sortDirection] = sortValue.split(":");

    setParam(params, "search", formData.get("search"));
    setParam(params, "categoryId", formData.get("categoryId"));
    setParam(params, "level", formData.get("level"));
    setParam(params, "minPrice", unformatPriceInput(formData.get("minPrice")));
    setParam(params, "maxPrice", unformatPriceInput(formData.get("maxPrice")));
    setParam(params, "language", formData.get("language"));
    setParam(params, "certificateEnabled", formData.get("certificateEnabled"));
    setParam(params, "sortField", sortField);
    setParam(params, "sortDirection", sortDirection);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      id={COURSE_CATALOG_CONTROLS_FORM_ID}
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          type="submit"
        >
          Apply
        </button>
      </div>

      <div className="mt-5 grid gap-4 text-foreground">
        <label className="text-sm font-semibold" htmlFor="categoryId">
          Category
          <select
            className={inputClasses}
            defaultValue={query.categoryId ?? ""}
            id="categoryId"
            name="categoryId"
          >
            <option value="">All categories</option>
            {categoryGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((category) => (
                  <option key={category.id} value={category.id}>
                    {"--".repeat(category.depth)} {category.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold" htmlFor="level">
          Level
          <select
            className={inputClasses}
            defaultValue={query.level ?? ""}
            id="level"
            name="level"
          >
            <option value="">All levels</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {formatCourseLevel(level)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <label className="text-sm font-semibold" htmlFor="minPrice">
            Min price
            <input
              className={inputClasses}
              id="minPrice"
              inputMode="numeric"
              name="minPrice"
              type="text"
              value={minPrice}
              onChange={(event) => {
                setMinPrice(formatPriceInput(event.target.value));
              }}
            />
          </label>

          <label className="text-sm font-semibold" htmlFor="maxPrice">
            Max price
            <input
              className={inputClasses}
              id="maxPrice"
              inputMode="numeric"
              name="maxPrice"
              type="text"
              value={maxPrice}
              onChange={(event) => {
                setMaxPrice(formatPriceInput(event.target.value));
              }}
            />
          </label>
        </div>

        <LanguageSearchDropdown
          defaultValue={query.language ?? ""}
          inputClasses={inputClasses}
        />

        <label className="text-sm font-semibold" htmlFor="certificateEnabled">
          Certificate
          <select
            className={inputClasses}
            defaultValue={
              query.certificateEnabled === undefined ||
              query.certificateEnabled === null
                ? ""
                : String(query.certificateEnabled)
            }
            id="certificateEnabled"
            name="certificateEnabled"
          >
            <option value="">Any</option>
            <option value="true">Certificate included</option>
            <option value="false">No certificate</option>
          </select>
        </label>

        <label className="text-sm font-semibold" htmlFor="sort">
          Sort
          <select
            className={inputClasses}
            defaultValue={
              query.sortField && query.sortDirection
                ? `${query.sortField}:${query.sortDirection}`
                : "publishedAt:desc"
            }
            id="sort"
            name="sort"
          >
            {sortOptions.map((option) => (
              <option
                key={option.label}
                value={`${option.sortField}:${option.sortDirection}`}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}

function formatPriceInput(
  value: FormDataEntryValue | string | number | null | undefined,
) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) return "";

  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

function unformatPriceInput(value: FormDataEntryValue | string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function setParam(
  params: URLSearchParams,
  name: string,
  value: FormDataEntryValue | string | null,
) {
  const stringValue = String(value ?? "").trim();

  if (stringValue) {
    params.set(name, stringValue);
    return;
  }

  params.delete(name);
}
