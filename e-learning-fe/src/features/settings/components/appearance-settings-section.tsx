const sectionClasses =
  "rounded-3xl border border-[#d9d9d9] bg-white p-6 shadow-sm";

const optionCardClasses =
  "flex flex-col gap-4 rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:flex-row sm:items-center sm:justify-between";

const actionButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl border border-[#d9d9d9] bg-white px-5 text-sm font-semibold text-[#111827] transition hover:bg-[#f7f7f7]";

const primaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#9fb1cf] px-5 text-sm font-semibold text-white transition hover:bg-[#879cbd]";

export function AppearanceSettingsSection() {
  return (
    <section className={sectionClasses}>
      <h2 className="text-xl font-semibold text-[#1f1f1f]">Appearance</h2>
      <p className="mt-1 text-sm text-[#344563]">
        Customize how your learning dashboard looks and feels.
      </p>

      <div className="mt-6 space-y-4">
        <div className={optionCardClasses}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#111827]">Theme</h3>
              <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-semibold text-[#0056d2]">
                Display
              </span>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#344563]">
              Choose between light mode, dark mode, or your system default
              preference for a more comfortable learning experience.
            </p>
          </div>

          <button className={primaryButtonClasses} type="button">
            Change theme
          </button>
        </div>

        <div className={optionCardClasses}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#111827]">Compact mode</h3>
              <span className="rounded-full bg-[#f7f7f7] px-3 py-1 text-xs font-semibold text-[#5b6780]">
                Coming soon
              </span>
            </div>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#344563]">
              Reduce spacing across course pages, lesson lists, and learning
              tools so more content fits on your screen.
            </p>
          </div>

          <button className={actionButtonClasses} type="button" disabled>
            Coming soon
          </button>
        </div>
      </div>
    </section>
  );
}
