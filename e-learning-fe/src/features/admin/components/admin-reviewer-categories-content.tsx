"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import { unwrapData, unwrapList } from "../api/admin-query";
import {
  flattenCategories,
  normalizeAdminCategory,
} from "../api/admin-api-helpers";
import { getAdminCategories } from "../api/admin-category-api";
import {
  getAdminReviewerCategories,
  getAdminReviewers,
  replaceAdminReviewerCategories,
} from "../api/admin-reviewer-category-api";
import type { AdminCourseCategory } from "../types/admin-category";
import type { ReviewerCategoryAuthorizations } from "../types/admin-reviewer-category";
import type { AdminUser } from "../types/admin-user";
import { getErrorMessage } from "../utils/admin-format";
import { AdminStatusMessage } from "./admin-modal";

const inputClassName =
  "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";

export function AdminReviewerCategoriesContent() {
  const { accessToken, status } = useAuth();

  const [reviewers, setReviewers] = useState<AdminUser[]>([]);
  const [categories, setCategories] = useState<AdminCourseCategory[]>([]);

  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [reviewerSearch, setReviewerSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedReviewer = reviewers.find(
    (reviewer) => reviewer.id === selectedReviewerId,
  );

  const filteredReviewers = useMemo(() => {
    const keyword = reviewerSearch.trim().toLowerCase();

    return reviewers.filter((reviewer) => {
      if (reviewer.role !== "REVIEWER") {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return `${reviewer.fullName} ${reviewer.email}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [reviewerSearch, reviewers]);

  const filteredCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();

    if (!keyword) {
      return categories;
    }

    return categories.filter((category) =>
      `${category.name} ${category.slug}`.toLowerCase().includes(keyword),
    );
  }, [categories, categorySearch]);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [reviewerPayload, categoryResponse] = await Promise.all([
          getAdminReviewers({}, accessToken!),
          getAdminCategories({ limit: 100, page: 1 }, accessToken!),
        ]);

        if (cancelled) {
          return;
        }

        const reviewerList = unwrapList<AdminUser>(reviewerPayload).filter(
          (item) => item.role === "REVIEWER",
        );

        setReviewers(reviewerList);
        setCategories(
          flattenCategories(categoryResponse.data).map(normalizeAdminCategory),
        );
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error, "Failed to load reviewers and categories."),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, status]);

  useEffect(() => {
    if (!selectedReviewerId) {
      return;
    }

    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadAuthorizations() {
      setAuthorizationLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const payload = await getAdminReviewerCategories(
          selectedReviewerId,
          accessToken!,
        );

        if (cancelled) {
          return;
        }

        const data = unwrapData<ReviewerCategoryAuthorizations>(payload);

        setSelectedCategoryIds(
          Array.isArray(data?.categories)
            ? data.categories.map((category) => category.id)
            : [],
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSelectedCategoryIds([]);
        setErrorMessage(
          getErrorMessage(
            error,
            "Failed to load reviewer category authorizations.",
          ),
        );
      } finally {
        if (!cancelled) {
          setAuthorizationLoading(false);
        }
      }
    }

    void loadAuthorizations();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedReviewerId, status]);

  function handleSelectReviewer(reviewerId: string) {
    setSelectedReviewerId(reviewerId);
  }

  function toggleCategory(categoryId: string) {
    setSuccessMessage(null);
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  function selectAllVisible() {
    setSuccessMessage(null);
    setSelectedCategoryIds((current) =>
      Array.from(
        new Set([...current, ...filteredCategories.map((item) => item.id)]),
      ),
    );
  }

  function clearAll() {
    setSuccessMessage(null);
    setSelectedCategoryIds([]);
  }

  async function handleSave() {
    if (!selectedReviewerId) {
      setErrorMessage("Please select a reviewer first.");
      return;
    }

    if (!accessToken) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await replaceAdminReviewerCategories(
        selectedReviewerId,
        { categoryIds: selectedCategoryIds },
        accessToken,
      );

      setSuccessMessage("Reviewer category authorizations saved successfully.");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Failed to save reviewer category authorizations.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      {errorMessage ? (
        <AdminStatusMessage variant="error">{errorMessage}</AdminStatusMessage>
      ) : null}
      {successMessage ? (
        <AdminStatusMessage variant="success">
          {successMessage}
        </AdminStatusMessage>
      ) : null}

      {loading ? (
        <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <p className="text-sm text-muted-foreground">Loading data...</p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-semibold">Reviewers</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a reviewer to manage category permissions.
              </p>
              <input
                className={`${inputClassName} mt-4`}
                onChange={(event) => setReviewerSearch(event.target.value)}
                placeholder="Search reviewer..."
                type="search"
                value={reviewerSearch}
              />
            </div>

            <div className="max-h-[620px] overflow-y-auto p-2">
              {filteredReviewers.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  No reviewers found.
                </p>
              ) : (
                filteredReviewers.map((reviewer) => {
                  const active = reviewer.id === selectedReviewerId;

                  return (
                    <button
                      className={`block w-full rounded-md px-3 py-3 text-left transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      key={reviewer.id}
                      onClick={() => handleSelectReviewer(reviewer.id)}
                      type="button"
                    >
                      <p className="truncate text-sm font-semibold">
                        {reviewer.fullName || "Unnamed reviewer"}
                      </p>
                      <p
                        className={`truncate text-xs ${
                          active
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {reviewer.email}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Authorized Categories
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedReviewer ? (
                      <>
                        Managing permissions for{" "}
                        <span className="font-medium text-foreground">
                          {selectedReviewer.fullName ||
                            selectedReviewer.email ||
                            "this reviewer"}
                        </span>
                      </>
                    ) : (
                      "Select a reviewer on the left first."
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold disabled:opacity-60"
                    disabled={!selectedReviewerId}
                    onClick={selectAllVisible}
                    type="button"
                  >
                    Select Visible
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger/30 bg-danger/10 px-4 text-sm font-semibold text-danger disabled:opacity-60"
                    disabled={!selectedReviewerId}
                    onClick={clearAll}
                    type="button"
                  >
                    Clear All
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    disabled={!selectedReviewerId || saving}
                    onClick={() => void handleSave()}
                    type="button"
                  >
                    {saving ? "Saving..." : "Save Authorizations"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <input
                  className={inputClassName}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  placeholder="Search category..."
                  type="search"
                  value={categorySearch}
                />
                <p className="text-sm text-muted-foreground">
                  Selected:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedCategoryIds.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-5">
              {!selectedReviewerId ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Please select a reviewer to view or update category
                    authorizations.
                  </p>
                </div>
              ) : authorizationLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading reviewer permissions...
                </p>
              ) : filteredCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories found.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredCategories.map((category) => {
                    const checked = selectedCategoryIds.includes(category.id);
                    const inactive = category.isActive === false;

                    return (
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                        key={category.id}
                      >
                        <input
                          checked={checked}
                          className="mt-1"
                          onChange={() => toggleCategory(category.id)}
                          type="checkbox"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">
                              {category.name}
                            </p>
                            {inactive ? (
                              <Badge variant="warning">Inactive</Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {category.slug}
                          </p>
                          {category.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
