"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from "../api/admin-user-api";
import type {
  AdminGender,
  AdminRole,
  AdminUser,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "../types/admin-user";
import { adminGenderOptions, adminRoleOptions } from "../types/admin-user";
import {
  formatDateInput,
  formatDateTime,
  formatEnumLabel,
  getErrorMessage,
  isStrongPassword,
  STRONG_PASSWORD_HINT,
} from "../utils/admin-format";
import { AdminModal, AdminStatusMessage } from "./admin-modal";

const PAGE_SIZE = 10;

const roleFilterOptions: Array<{ label: string; value: AdminRole | "all" }> = [
  { label: "All roles", value: "all" },
  { label: "Admin", value: "ADMIN" },
  { label: "Instructor", value: "INSTRUCTOR" },
  { label: "Learner", value: "LEARNER" },
  { label: "Reviewer", value: "REVIEWER" },
];

const activeFilterOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const verifiedFilterOptions = [
  { label: "All verification", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Not verified", value: "unverified" },
];

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
  variant: "danger" | "success" | "warning";
} | null;

type FormState = {
  avatarUrl: string;
  dateOfBirth: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  gender: "" | AdminGender;
  isActive: boolean;
  password: string;
  phoneNumber: string;
  role: AdminRole;
};

const emptyForm: FormState = {
  avatarUrl: "",
  dateOfBirth: "",
  email: "",
  emailVerified: false,
  fullName: "",
  gender: "",
  isActive: true,
  password: "",
  phoneNumber: "",
  role: "LEARNER",
};

export function AdminUsersContent() {
  const { accessToken, status } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<AdminRole | "all">("all");
  const [filterActive, setFilterActive] = useState("all");
  const [filterVerified, setFilterVerified] = useState("all");
  const [tableLoading, setTableLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(null);
  const [sort, setSort] = useState("createdAt:desc");

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setTableLoading(true);
      setLoadError(null);

      try {
        const result = await getAdminUsers(
          { limit: 100, page: 1 },
          accessToken!,
        );

        if (!cancelled) {
          setUsers(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Could not load users."));
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [accessToken, status]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const [sortBy, sortOrder] = sort.split(":");

    return users
      .filter((item) =>
        matchesUserFilters(
          item,
          keyword,
          filterRole,
          filterActive,
          filterVerified,
        ),
      )
      .sort((left, right) => compareUsers(left, right, sortBy, sortOrder));
  }, [filterActive, filterRole, filterVerified, search, sort, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setFormMode("create");
    setSelectedUserId(null);
    setFormState(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditModal(user: AdminUser) {
    setFormMode("edit");
    setSelectedUserId(user.id);
    setFormState({
      avatarUrl: user.avatarUrl ?? "",
      dateOfBirth: formatDateInput(user.dateOfBirth),
      email: user.email ?? "",
      emailVerified: Boolean(user.emailVerified),
      fullName: user.fullName ?? "",
      gender: user.gender ?? "",
      isActive: Boolean(user.isActive),
      password: "",
      phoneNumber: user.phoneNumber ?? "",
      role: user.role ?? "LEARNER",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function reloadUsers() {
    if (!accessToken) {
      return;
    }

    const result = await getAdminUsers({ limit: 100, page: 1 }, accessToken);
    setUsers(result.data);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const validationError = validateUserForm(formState, formMode);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (formMode === "create") {
        await createAdminUser(buildCreatePayload(formState), accessToken);
        setAlertState({
          message: "The new user has been created successfully.",
          title: "User created",
          variant: "success",
        });
      } else if (selectedUserId) {
        await updateAdminUser(
          selectedUserId,
          buildUpdatePayload(formState),
          accessToken,
        );
        setAlertState({
          message: "The user information has been updated successfully.",
          title: "User updated",
          variant: "success",
        });
      }

      setFormOpen(false);
      await reloadUsers();
    } catch (error) {
      setFormError(getErrorMessage(error, "Save failed."));
    } finally {
      setFormLoading(false);
    }
  }

  function requestDelete(user: AdminUser) {
    setConfirmState({
      confirmText: "Delete",
      message: `Are you sure you want to delete "${user.fullName || user.email || "this user"}"? This action may remove the user from the system.`,
      onConfirm: async () => {
        if (!accessToken) {
          return;
        }

        await deleteAdminUser(user.id, accessToken);

        if (detailUser?.id === user.id) {
          setDetailUser(null);
        }

        await reloadUsers();
        setAlertState({
          message: "The user has been deleted successfully.",
          title: "User deleted",
          variant: "success",
        });
      },
      open: true,
      title: "Delete user?",
      variant: "danger",
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
      <UsersToolbar
        filterActive={filterActive}
        filterRole={filterRole}
        filterVerified={filterVerified}
        onCreate={openCreateModal}
        onFilterActive={(value) => {
          setFilterActive(value);
          setPage(1);
        }}
        onFilterRole={(value) => {
          setFilterRole(value);
          setPage(1);
        }}
        onFilterVerified={(value) => {
          setFilterVerified(value);
          setPage(1);
        }}
        onSearch={(value) => {
          setSearchInput(value);
          setSearch(value);
          setPage(1);
        }}
        onSort={setSort}
        searchInput={searchInput}
        sort={sort}
        total={filteredUsers.length}
      />
      <UsersTable
        loading={tableLoading}
        onDelete={requestDelete}
        onEdit={openEditModal}
        onInfo={setDetailUser}
        onPageChange={setPage}
        page={currentPage}
        total={filteredUsers.length}
        totalPages={totalPages}
        users={pageUsers}
      />
      <UserFormModal
        error={formError}
        formState={formState}
        loading={formLoading}
        mode={formMode}
        onChange={updateForm}
        onClose={() => {
          if (!formLoading) {
            setFormOpen(false);
            setFormError(null);
          }
        }}
        onSubmit={handleSubmit}
        open={formOpen}
      />
      <UserDetailModal onClose={() => setDetailUser(null)} user={detailUser} />
      <ConfirmModal
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

const sortOptions = [
  { label: "Newest first", value: "createdAt:desc" },
  { label: "Oldest first", value: "createdAt:asc" },
  { label: "Name A-Z", value: "fullName:asc" },
  { label: "Name Z-A", value: "fullName:desc" },
  { label: "Email A-Z", value: "email:asc" },
  { label: "Email Z-A", value: "email:desc" },
  { label: "Role A-Z", value: "role:asc" },
  { label: "Role Z-A", value: "role:desc" },
];

const inputClassName =
  "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary";

function UsersToolbar({
  filterActive,
  filterRole,
  filterVerified,
  onCreate,
  onFilterActive,
  onFilterRole,
  onFilterVerified,
  onSearch,
  onSort,
  searchInput,
  sort,
  total,
}: {
  filterActive: string;
  filterRole: AdminRole | "all";
  filterVerified: string;
  onCreate: () => void;
  onFilterActive: (value: string) => void;
  onFilterRole: (value: AdminRole | "all") => void;
  onFilterVerified: (value: string) => void;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  searchInput: string;
  sort: string;
  total: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} user{total === 1 ? "" : "s"}
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          onClick={onCreate}
          type="button"
        >
          New User
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <input
          className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search name, email, phone..."
          type="search"
          value={searchInput}
        />
        <FilterSelect
          onChange={(value) => onFilterRole(value as AdminRole | "all")}
          options={roleFilterOptions}
          value={filterRole}
        />
        <FilterSelect
          onChange={onFilterActive}
          options={activeFilterOptions}
          value={filterActive}
        />
        <FilterSelect
          onChange={onFilterVerified}
          options={verifiedFilterOptions}
          value={filterVerified}
        />
        <FilterSelect onChange={onSort} options={sortOptions} value={sort} />
      </div>
    </section>
  );
}

function UsersTable({
  loading,
  onDelete,
  onEdit,
  onInfo,
  onPageChange,
  page,
  total,
  totalPages,
  users,
}: {
  loading: boolean;
  onDelete: (user: AdminUser) => void;
  onEdit: (user: AdminUser) => void;
  onInfo: (user: AdminUser) => void;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  totalPages: number;
  users: AdminUser[];
}) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  className="border-b border-border last:border-b-0"
                  key={user.id}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {user.fullName || "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatEnumLabel(user.gender)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{user.email || "-"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.phoneNumber || "No phone"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="action">{formatEnumLabel(user.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={user.isActive ? "action" : "danger"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        variant={user.emailVerified ? "action" : "warning"}
                      >
                        {user.emailVerified ? "Verified" : "Not verified"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <RowButton onClick={() => onInfo(user)}>Info</RowButton>
                      <RowButton onClick={() => onEdit(user)}>Edit</RowButton>
                      <RowButton danger onClick={() => onDelete(user)}>
                        Delete
                      </RowButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Showing {from} to {to} of {total}
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
          <span className="inline-flex items-center px-2">
            {page} / {totalPages}
          </span>
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

function UserFormModal({
  error,
  formState,
  loading,
  mode,
  onChange,
  onClose,
  onSubmit,
  open,
}: {
  error: string | null;
  formState: FormState;
  loading: boolean;
  mode: "create" | "edit";
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  open: boolean;
}) {
  return (
    <AdminModal
      onClose={onClose}
      open={open}
      title={mode === "create" ? "Create user" : "Edit user"}
    >
      <form className="grid gap-3" onSubmit={onSubmit}>
        {error ? (
          <AdminStatusMessage variant="error">{error}</AdminStatusMessage>
        ) : null}
        <Field label="Full name">
          <input
            className={inputClassName}
            onChange={(event) => onChange("fullName", event.target.value)}
            required
            value={formState.fullName}
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClassName}
            onChange={(event) => onChange("email", event.target.value)}
            required
            type="email"
            value={formState.email}
          />
        </Field>
        <Field
          label={mode === "create" ? "Password" : "New password (optional)"}
        >
          <input
            className={inputClassName}
            onChange={(event) => onChange("password", event.target.value)}
            type="password"
            value={formState.password}
          />
        </Field>
        <Field label="Phone">
          <input
            className={inputClassName}
            onChange={(event) => onChange("phoneNumber", event.target.value)}
            value={formState.phoneNumber}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date of birth">
            <input
              className={inputClassName}
              onChange={(event) => onChange("dateOfBirth", event.target.value)}
              type="date"
              value={formState.dateOfBirth}
            />
          </Field>
          <Field label="Gender">
            <select
              className={inputClassName}
              onChange={(event) =>
                onChange("gender", event.target.value as FormState["gender"])
              }
              value={formState.gender}
            >
              <option value="">Not set</option>
              {adminGenderOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Role">
          <select
            className={inputClassName}
            onChange={(event) =>
              onChange("role", event.target.value as AdminRole)
            }
            value={formState.role}
          >
            {adminRoleOptions.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Avatar URL">
          <input
            className={inputClassName}
            onChange={(event) => onChange("avatarUrl", event.target.value)}
            value={formState.avatarUrl}
          />
        </Field>
        {mode === "edit" ? (
          <div className="flex flex-wrap gap-4 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input
                checked={formState.isActive}
                onChange={(event) => onChange("isActive", event.target.checked)}
                type="checkbox"
              />
              Active
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={formState.emailVerified}
                onChange={(event) =>
                  onChange("emailVerified", event.target.checked)
                }
                type="checkbox"
              />
              Email verified
            </label>
          </div>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function UserDetailModal({
  onClose,
  user,
}: {
  onClose: () => void;
  user: AdminUser | null;
}) {
  return (
    <AdminModal onClose={onClose} open={user !== null} title="User details">
      {user ? (
        <dl className="grid gap-2 text-sm text-foreground">
          <Detail label="Name" value={user.fullName || "-"} />
          <Detail label="Email" value={user.email || "-"} />
          <Detail label="Phone" value={user.phoneNumber || "-"} />
          <Detail label="Role" value={formatEnumLabel(user.role)} />
          <Detail label="Gender" value={formatEnumLabel(user.gender)} />
          <Detail
            label="Date of birth"
            value={formatDateInput(user.dateOfBirth) || "-"}
          />
          <Detail
            label="Status"
            value={user.isActive ? "Active" : "Inactive"}
          />
          <Detail
            label="Email verified"
            value={user.emailVerified ? "Verified" : "Not verified"}
          />
          <Detail label="Last login" value={formatDateTime(user.lastLoginAt)} />
          <Detail label="Created" value={formatDateTime(user.createdAt)} />
        </dl>
      ) : null}
    </AdminModal>
  );
}

function ConfirmModal({
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
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold"
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

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

function FilterSelect({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <select
      className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RowButton({
  children,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
        danger
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
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

function matchesUserFilters(
  item: AdminUser,
  keyword: string,
  filterRole: AdminRole | "all",
  filterActive: string,
  filterVerified: string,
) {
  if (filterRole !== "all" && item.role !== filterRole) {
    return false;
  }

  if (filterActive === "active" && !item.isActive) {
    return false;
  }

  if (filterActive === "inactive" && item.isActive) {
    return false;
  }

  if (filterVerified === "verified" && !item.emailVerified) {
    return false;
  }

  if (filterVerified === "unverified" && item.emailVerified) {
    return false;
  }

  if (!keyword) {
    return true;
  }

  return [item.fullName, item.email, item.phoneNumber, item.role, item.gender]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(keyword);
}

function compareUsers(
  left: AdminUser,
  right: AdminUser,
  sortBy: string,
  sortOrder: string,
) {
  const leftValue = getSortValue(left, sortBy);
  const rightValue = getSortValue(right, sortBy);
  const compare = leftValue.localeCompare(rightValue);

  return sortOrder === "asc" ? compare : -compare;
}

function getSortValue(user: AdminUser, sortBy: string) {
  if (sortBy === "fullName") return user.fullName || "";
  if (sortBy === "email") return user.email || "";
  if (sortBy === "role") return user.role || "";

  return user.createdAt ? new Date(user.createdAt).toISOString() : "";
}

function validateUserForm(form: FormState, mode: "create" | "edit") {
  if (form.fullName.trim().length < 2) {
    return "Full name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    return "Email is required.";
  }

  if (mode === "create" && !form.password.trim()) {
    return "Password is required when creating a user.";
  }

  if (form.password.trim() && !isStrongPassword(form.password)) {
    return STRONG_PASSWORD_HINT;
  }

  return null;
}

function buildCreatePayload(form: FormState): CreateAdminUserPayload {
  return {
    avatarUrl: form.avatarUrl.trim() || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    email: form.email.trim(),
    fullName: form.fullName.trim(),
    gender: form.gender || undefined,
    password: form.password.trim(),
    phoneNumber: form.phoneNumber.trim() || undefined,
    role: form.role,
  };
}

function buildUpdatePayload(form: FormState): UpdateAdminUserPayload {
  return {
    avatarUrl: form.avatarUrl.trim() || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    email: form.email.trim(),
    emailVerified: form.emailVerified,
    fullName: form.fullName.trim(),
    gender: form.gender || undefined,
    isActive: form.isActive,
    password: form.password.trim() || undefined,
    phoneNumber: form.phoneNumber.trim() || undefined,
    role: form.role,
  };
}
