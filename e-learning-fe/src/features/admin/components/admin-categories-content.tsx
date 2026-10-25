"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import { normalizeAdminCategory } from "../api/admin-api-helpers";
import {
  createAdminCategory,
  getAdminCategories,
  restoreAdminCategory,
  softDeleteAdminCategory,
  updateAdminCategory,
  updateAdminCategoryActiveStatus,
} from "../api/admin-category-api";
import type {
  AdminCategorySortBy,
  AdminCategorySortOrder,
  AdminCourseCategory,
  CreateAdminCategoryPayload,
  UpdateAdminCategoryPayload,
} from "../types/admin-category";
import { formatDateTime, getErrorMessage } from "../utils/admin-format";
import { AdminModal, AdminStatusMessage } from "./admin-modal";

const PAGE_SIZE = 10;

const inputClassName =
  "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";

type AlertState = {
  message: string;
  title: string;
  variant: "error" | "success";
} | null;

type ConfirmState = {
  confirmText: string;
  message: string;
  onConfirm: (() => Promise<void>) | null;
  open: boolean;
  title: string;
} | null;

type FormState = {
  description: string;
  isActive: boolean;
  name: string;
  order: string;
  parentId: string;
};

const emptyForm: FormState = {
  description: "",
  isActive: true,
  name: "",
  order: "0",
  parentId: "",
};

export function AdminCategoriesContent() {
  const { accessToken, status } = useAuth();
  const [categories, setCategories] = useState<AdminCourseCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "true" | "false">(
    "all",
  );
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<AdminCategorySortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<AdminCategorySortOrder>("desc");
  const [tableLoading, setTableLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [detail, setDetail] = useState<AdminCourseCategory | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadCategories() {
      setTableLoading(true);
      setLoadError(null);

      try {
        const result = await getAdminCategories(
          {
            includeDeleted,
            isActive:
              filterActive === "all" ? undefined : filterActive === "true",
            limit: PAGE_SIZE,
            page,
            search,
            sortBy,
            sortOrder,
          },
          accessToken!,
        );

        if (!cancelled) {
          setCategories(result.data.map(normalizeAdminCategory));
          setTotal(result.meta.total);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Failed to load categories."));
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    filterActive,
    includeDeleted,
    page,
    reloadKey,
    search,
    sortBy,
    sortOrder,
    status,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() {
    setFormMode("create");
    setSelectedId(null);
    setFormState(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(category: AdminCourseCategory) {
    const normalized = normalizeAdminCategory(category);

    setFormMode("edit");
    setSelectedId(normalized.id);
    setFormState({
      description: normalized.description || "",
      isActive: normalized.isActive,
      name: normalized.name || "",
      order: String(normalized.order ?? 0),
      parentId: normalized.parentId || "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const validationError = validateCategoryForm(formState, formMode);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (formMode === "create") {
        await createAdminCategory(buildCreatePayload(formState), accessToken);
        setPage(1);
        setAlertState({
          message: "The category has been created successfully.",
          title: "Category created",
          variant: "success",
        });
      } else if (selectedId) {
        await updateAdminCategory(
          selectedId,
          buildUpdatePayload(formState),
          accessToken,
        );
        setAlertState({
          message: "The category has been updated successfully.",
          title: "Category updated",
          variant: "success",
        });
      }

      setFormOpen(false);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, "Save failed."));
    } finally {
      setFormLoading(false);
    }
  }

  function requestAction(
    title: string,
    message: string,
    confirmText: string,
    action: () => Promise<void>,
    successTitle: string,
    successMessage: string,
  ) {
    setConfirmState({
      confirmText,
      message,
      onConfirm: async () => {
        await action();
        setReloadKey((current) => current + 1);
        setAlertState({
          message: successMessage,
          title: successTitle,
          variant: "success",
        });
      },
      open: true,
      title,
    });
  }

  async function confirmAction() {
    if (!confirmState?.onConfirm) {
      return;
    }

    setConfirmLoading(true);

    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch (error) {
      setConfirmState(null);
      setAlertState({
        message: getErrorMessage(error, "The action failed."),
        title: "Action failed",
        variant: "error",
      });
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      {loadError ? (
        <AdminStatusMessage variant="error">{loadError}</AdminStatusMessage>
      ) : null}
      <CategoryToolbar
        filterActive={filterActive}
        includeDeleted={includeDeleted}
        onCreate={openCreate}
        onFilterActive={(value) => {
          setFilterActive(value);
          setPage(1);
        }}
        onIncludeDeleted={(value) => {
          setIncludeDeleted(value);
          setPage(1);
        }}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onSort={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
          setPage(1);
        }}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
        total={total}
      />
      <CategoryTable
        accessToken={accessToken}
        categories={categories}
        loading={tableLoading}
        onEdit={openEdit}
        onInfo={setDetail}
        onPageChange={setPage}
        onRequestAction={requestAction}
        page={page}
        totalPages={totalPages}
      />
      <CategoryFormModal
        category={categories.find((item) => item.id === selectedId) ?? null}
        formError={formError}
        formLoading={formLoading}
        formState={formState}
        onCancel={() => {
          if (!formLoading) {
            setFormOpen(false);
            setFormError(null);
          }
        }}
        onChange={(patch) =>
          setFormState((current) => ({ ...current, ...patch }))
        }
        onSubmit={handleSubmit}
        open={formOpen}
        options={categories}
        title={formMode === "create" ? "Create category" : "Edit category"}
      />
      <CategoryDetailModal category={detail} onClose={() => setDetail(null)} />
      <ConfirmCategoryModal
        loading={confirmLoading}
        onClose={() => {
          if (!confirmLoading) {
            setConfirmState(null);
          }
        }}
        onConfirm={() => void confirmAction()}
        state={confirmState}
      />
      <AdminModal
        onClose={() => setAlertState(null)}
        open={alertState !== null}
        title={alertState?.title || "Notice"}
      >
        {alertState ? (
          <AdminStatusMessage variant={alertState.variant}>
            {alertState.message}
          </AdminStatusMessage>
        ) : null}
      </AdminModal>
    </div>
  );
}

function CategoryToolbar({
  filterActive,
  includeDeleted,
  onCreate,
  onFilterActive,
  onIncludeDeleted,
  onSearch,
  onSort,
  search,
  sortBy,
  sortOrder,
  total,
}: {
  filterActive: "all" | "true" | "false";
  includeDeleted: boolean;
  onCreate: () => void;
  onFilterActive: (value: "all" | "true" | "false") => void;
  onIncludeDeleted: (value: boolean) => void;
  onSearch: (value: string) => void;
  onSort: (field: AdminCategorySortBy, order: AdminCategorySortOrder) => void;
  search: string;
  sortBy: AdminCategorySortBy;
  sortOrder: AdminCategorySortOrder;
  total: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">{total} total</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground"
          onClick={onCreate}
          type="button"
        >
          New Category
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <input
          className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search categories..."
          value={search}
        />
        <select
          className="min-h-11 rounded-md border border-border bg-background px-3 text-sm"
          onChange={(event) =>
            onFilterActive(event.target.value as "all" | "true" | "false")
          }
          value={filterActive}
        >
          <option value="all">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          className="min-h-11 rounded-md border border-border bg-background px-3 text-sm"
          onChange={(event) => {
            const [field, order] = event.target.value.split(":");
            onSort(
              field as AdminCategorySortBy,
              order as AdminCategorySortOrder,
            );
          }}
          value={`${sortBy}:${sortOrder}`}
        >
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="name:asc">Name A-Z</option>
          <option value="name:desc">Name Z-A</option>
          <option value="order:asc">Order ascending</option>
          <option value="updatedAt:desc">Recently updated</option>
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            checked={includeDeleted}
            onChange={(event) => onIncludeDeleted(event.target.checked)}
            type="checkbox"
          />
          Include deleted
        </label>
      </div>
    </section>
  );
}

type RequestAction = (
  title: string,
  message: string,
  confirmText: string,
  action: () => Promise<void>,
  successTitle: string,
  successMessage: string,
) => void;

function CategoryTable({
  accessToken,
  categories,
  loading,
  onEdit,
  onInfo,
  onPageChange,
  onRequestAction,
  page,
  totalPages,
}: {
  accessToken: string | null;
  categories: AdminCourseCategory[];
  loading: boolean;
  onEdit: (category: AdminCourseCategory) => void;
  onInfo: (category: AdminCourseCategory) => void;
  onPageChange: (page: number) => void;
  onRequestAction: RequestAction;
  page: number;
  totalPages: number;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <CategoryRow
                  accessToken={accessToken}
                  category={category}
                  key={category.id}
                  onEdit={onEdit}
                  onInfo={onInfo}
                  onRequestAction={onRequestAction}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-border px-3 py-1.5 font-semibold disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-md border border-border px-3 py-1.5 font-semibold disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function CategoryRow({
  accessToken,
  category,
  onEdit,
  onInfo,
  onRequestAction,
}: {
  accessToken: string | null;
  category: AdminCourseCategory;
  onEdit: (category: AdminCourseCategory) => void;
  onInfo: (category: AdminCourseCategory) => void;
  onRequestAction: RequestAction;
}) {
  const deleted = Boolean(category.deletedAt);
  const nextActive = !category.isActive;

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <p className="font-semibold">{category.name}</p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {category.description || "No description"}
        </p>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
      <td className="px-4 py-3">{category.order ?? 0}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={category.isActive ? "action" : "danger"}>
            {category.isActive ? "Active" : "Inactive"}
          </Badge>
          {deleted ? <Badge variant="danger">Deleted</Badge> : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <RowButton onClick={() => onInfo(category)}>Info</RowButton>
          <RowButton disabled={deleted} onClick={() => onEdit(category)}>
            Edit
          </RowButton>
          <RowButton
            disabled={deleted || !accessToken}
            onClick={() =>
              onRequestAction(
                nextActive ? "Activate category?" : "Deactivate category?",
                `Are you sure you want to ${nextActive ? "activate" : "deactivate"} "${category.name}"?`,
                nextActive ? "Activate" : "Deactivate",
                () =>
                  updateAdminCategoryActiveStatus(
                    category.id,
                    nextActive,
                    accessToken!,
                  ).then(() => undefined),
                nextActive ? "Category activated" : "Category deactivated",
                `The category has been ${nextActive ? "activated" : "deactivated"}.`,
              )
            }
          >
            {category.isActive ? "Deactivate" : "Activate"}
          </RowButton>
          {deleted ? (
            <RowButton
              onClick={() =>
                onRequestAction(
                  "Restore category?",
                  `Are you sure you want to restore "${category.name}"?`,
                  "Restore",
                  () =>
                    restoreAdminCategory(category.id, accessToken!).then(
                      () => undefined,
                    ),
                  "Category restored",
                  "The category has been restored successfully.",
                )
              }
            >
              Restore
            </RowButton>
          ) : (
            <RowButton
              danger
              onClick={() =>
                onRequestAction(
                  "Delete category?",
                  `Are you sure you want to delete "${category.name}"? This category will be soft deleted and can be restored later.`,
                  "Delete",
                  () =>
                    softDeleteAdminCategory(category.id, accessToken!).then(
                      () => undefined,
                    ),
                  "Category deleted",
                  "The category has been soft deleted successfully.",
                )
              }
            >
              Delete
            </RowButton>
          )}
        </div>
      </td>
    </tr>
  );
}

function CategoryFormModal({
  category,
  formError,
  formLoading,
  formState,
  onCancel,
  onChange,
  onSubmit,
  open,
  options,
  title,
}: {
  category: AdminCourseCategory | null;
  formError: string | null;
  formLoading: boolean;
  formState: FormState;
  onCancel: () => void;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  open: boolean;
  options: AdminCourseCategory[];
  title: string;
}) {
  const parentOptions = options.filter(
    (option) => option.id !== category?.id && !option.deletedAt,
  );

  return (
    <AdminModal onClose={onCancel} open={open} title={title}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="category-name">
            Name
          </label>
          <input
            className={inputClassName}
            id="category-name"
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="e.g. Web Development"
            required
            value={formState.name}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="category-description">
            Description
          </label>
          <textarea
            className="min-h-24 w-full resize-y rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            id="category-description"
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Short description of this category"
            value={formState.description}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="category-order">
              Display order
            </label>
            <input
              className={inputClassName}
              id="category-order"
              min="0"
              onChange={(event) => onChange({ order: event.target.value })}
              type="number"
              value={formState.order}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="category-parent">
              Parent category
            </label>
            <select
              className={inputClassName}
              id="category-parent"
              onChange={(event) => onChange({ parentId: event.target.value })}
              value={formState.parentId}
            >
              <option value="">None (top-level)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            checked={formState.isActive}
            onChange={(event) => onChange({ isActive: event.target.checked })}
            type="checkbox"
          />
          Active
        </label>

        {formError ? (
          <AdminStatusMessage variant="error">{formError}</AdminStatusMessage>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold disabled:opacity-60"
            disabled={formLoading}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={formLoading}
            type="submit"
          >
            {formLoading ? "Saving..." : "Save category"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function CategoryDetailModal({
  category,
  onClose,
}: {
  category: AdminCourseCategory | null;
  onClose: () => void;
}) {
  return (
    <AdminModal
      onClose={onClose}
      open={category !== null}
      title="Category details"
    >
      {category ? (
        <dl className="grid gap-2 text-sm text-foreground">
          <Detail label="Name" value={category.name || "-"} />
          <Detail label="Slug" value={category.slug || "-"} />
          <Detail label="Description" value={category.description || "-"} />
          <Detail label="Parent" value={category.parentName || "None"} />
          <Detail label="Order" value={String(category.order ?? 0)} />
          <Detail
            label="Status"
            value={category.isActive ? "Active" : "Inactive"}
          />
          <Detail
            label="Deleted"
            value={
              category.deletedAt ? formatDateTime(category.deletedAt) : "No"
            }
          />
          <Detail
            label="Course count"
            value={String(category.courseCount ?? 0)}
          />
          <Detail label="Created" value={formatDateTime(category.createdAt)} />
          <Detail label="Updated" value={formatDateTime(category.updatedAt)} />
        </dl>
      ) : null}
    </AdminModal>
  );
}

function ConfirmCategoryModal({
  loading,
  onClose,
  onConfirm,
  state,
}: {
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  state: ConfirmState;
}) {
  return (
    <AdminModal
      onClose={onClose}
      open={state?.open === true}
      title={state?.title || "Confirm"}
    >
      <p>{state?.message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold disabled:opacity-60"
          disabled={loading}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
          onClick={onConfirm}
          type="button"
        >
          {loading ? "Working..." : state?.confirmText}
        </button>
      </div>
    </AdminModal>
  );
}

function RowButton({
  children,
  danger = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        danger
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function validateCategoryForm(form: FormState, mode: "create" | "edit") {
  if (!form.name.trim()) {
    return "Category name is required.";
  }

  if (mode === "create" && form.name.trim().length > 100) {
    return "Category name must be shorter than 100 characters.";
  }

  if (mode === "create" && form.description.trim().length > 500) {
    return "Description must be shorter than 500 characters.";
  }

  if (mode === "edit" && Number.isNaN(Number(form.order))) {
    return "Order must be a number.";
  }

  return null;
}

function buildCreatePayload(form: FormState): CreateAdminCategoryPayload {
  const payload: CreateAdminCategoryPayload = {
    name: form.name.trim(),
  };

  if (form.description.trim()) {
    payload.description = form.description.trim();
  }

  if (form.parentId) {
    payload.parentId = form.parentId;
  }

  return payload;
}

function buildUpdatePayload(form: FormState): UpdateAdminCategoryPayload {
  return {
    description: form.description.trim() || null,
    isActive: form.isActive,
    name: form.name.trim(),
    order: Number(form.order),
    parentId: form.parentId || null,
  };
}
