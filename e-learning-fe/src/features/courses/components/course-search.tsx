"use client";

import { useState } from "react";

import { COURSE_CATALOG_CONTROLS_FORM_ID } from "./course-filters";

type CourseSearchProps = {
  initialValue?: string | null;
};

const MIN_SEARCH_LENGTH = 3;

export function CourseSearch({ initialValue = "" }: CourseSearchProps) {
  const [search, setSearch] = useState(initialValue ?? "");
  const trimmedSearch = search.trim();
  const hasShortSearch =
    trimmedSearch.length > 0 && trimmedSearch.length < MIN_SEARCH_LENGTH;

  return (
    <div className="grid gap-2">
      <label className="sr-only" htmlFor="course-search">
        Search courses
      </label>
      <input
        aria-describedby="course-search-help"
        className="min-h-11 flex-1 rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20"
        form={COURSE_CATALOG_CONTROLS_FORM_ID}
        id="course-search"
        minLength={MIN_SEARCH_LENGTH}
        name="search"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search courses"
        type="search"
        value={search}
      />
      <p
        className={
          hasShortSearch
            ? "text-sm text-danger"
            : "text-sm text-muted-foreground"
        }
        id="course-search-help"
      >
        {hasShortSearch
          ? `Enter at least ${MIN_SEARCH_LENGTH} characters to search.`
          : "Search courses by title, topic, or description."}
      </p>
    </div>
  );
}
