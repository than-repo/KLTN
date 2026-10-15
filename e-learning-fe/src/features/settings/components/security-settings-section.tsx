"use client";

import { changePassword } from "@/features/auth/api/auth-api";
import { useState, type FormEvent } from "react";

const sectionClasses =
  "rounded-3xl border border-[#d9d9d9] bg-white p-6 shadow-sm";

const actionCardClasses =
  "flex flex-col gap-4 rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:flex-row sm:items-center sm:justify-between";

const actionButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl border border-[#d9d9d9] bg-white px-5 text-sm font-semibold text-[#111827] transition hover:bg-[#f7f7f7]";

const primaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#9fb1cf] px-5 text-sm font-semibold text-white transition hover:bg-[#879cbd] disabled:cursor-not-allowed disabled:opacity-60";

const inputClasses =
  "mt-2 min-h-11 w-full rounded-xl border border-[#d9d9d9] bg-white px-4 text-sm outline-none transition focus:border-[#9fb1cf] focus:ring-2 focus:ring-[#9fb1cf]/20";

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type SecuritySettingsSectionProps = {
  accessToken: string;
  onAccessTokenChanged?: (accessToken: string) => void;
};

function validateChangePasswordForm(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  if (!currentPassword) {
    return "Current password is required.";
  }

  if (!newPassword) {
    return "New password is required.";
  }

  if (newPassword === currentPassword) {
    return "New password must be different from current password.";
  }

  if (!passwordPattern.test(newPassword)) {
    return "Password needs uppercase, lowercase, number, and special character.";
  }

  if (newPassword !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function SecuritySettingsSection({
  accessToken,
  onAccessTokenChanged,
}: SecuritySettingsSectionProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  async function handleChangePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateChangePasswordForm(
      currentPassword,
      newPassword,
      confirmPassword,
    );

    if (validationError) {
      setFormError(validationError);
      setSuccessMessage(null);
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    setIsSubmittingPassword(true);

    try {
      const result = await changePassword(accessToken, {
        currentPassword,
        newPassword,
      });

      onAccessTokenChanged?.(result.accessToken);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangePasswordOpen(false);
      setSuccessMessage(result.message || "Password changed successfully.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to change password. Please try again.",
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  function handleToggleChangePassword() {
    setIsChangePasswordOpen((current) => !current);
    setFormError(null);
    setSuccessMessage(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <section className={sectionClasses}>
      <h2 className="text-xl font-semibold text-[#1f1f1f]">Security</h2>
      <p className="mt-1 text-sm text-[#344563]">
        Manage your password, account recovery, and email verification settings.
      </p>

      <div className="mt-6 space-y-4">
        <div className={actionCardClasses}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#111827]">Password</h3>
              <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-semibold text-[#0056d2]">
                Account protection
              </span>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#344563]">
              Update your password regularly to help keep your account secure.
              You may need to confirm your current password before creating a
              new one.
            </p>
          </div>

          <button
            className={primaryButtonClasses}
            onClick={handleToggleChangePassword}
            type="button"
          >
            {isChangePasswordOpen ? "Cancel" : "Change password"}
          </button>
        </div>

        {isChangePasswordOpen ? (
          <form
            className="rounded-2xl border border-[#e6e6e6] bg-[#fafafa] p-5"
            onSubmit={handleChangePasswordSubmit}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  className="text-sm font-semibold text-[#111827]"
                  htmlFor="currentPassword"
                >
                  Current password
                </label>
                <input
                  autoComplete="current-password"
                  className={inputClasses}
                  id="currentPassword"
                  name="currentPassword"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  type="password"
                  value={currentPassword}
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-[#111827]"
                  htmlFor="newPassword"
                >
                  New password
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClasses}
                  id="newPassword"
                  name="newPassword"
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  value={newPassword}
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-[#111827]"
                  htmlFor="confirmPassword"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClasses}
                  id="confirmPassword"
                  name="confirmPassword"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#5b6780]">
              Use at least 8 characters with uppercase, lowercase, number, and
              special character.
            </p>

            {formError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                className={primaryButtonClasses}
                disabled={isSubmittingPassword}
                type="submit"
              >
                {isSubmittingPassword ? "Saving..." : "Save new password"}
              </button>
            </div>
          </form>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </p>
        ) : null}

        <div className={actionCardClasses}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#111827]">Forgot password</h3>
              <span className="rounded-full bg-[#f7f7f7] px-3 py-1 text-xs font-semibold text-[#5b6780]">
                Recovery
              </span>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#344563]">
              If you cannot access your account, send a secure password reset
              link to your email address and create a new password.
            </p>
          </div>

          <button className={actionButtonClasses} type="button">
            Send reset link
          </button>
        </div>

        <div className={actionCardClasses}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#111827]">
                Email verification
              </h3>
              <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#027a48]">
                Recommended
              </span>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#344563]">
              Verify your email address to protect your account, receive
              important security alerts, and recover access when needed.
            </p>
          </div>

          <button className={actionButtonClasses} type="button">
            Verify email
          </button>
        </div>
      </div>
    </section>
  );
}
