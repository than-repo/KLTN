// components/LanguageSearchDropdown.tsx
"use client";

import { useMemo, useState } from "react";

const LANGUAGES = [
  { label: "English", value: "English" },
  { label: "Vietnamese", value: "Vietnamese" },
] as const;

type Language = (typeof LANGUAGES)[number];

type LanguageSearchDropdownProps = {
  defaultValue?: string;
  inputClasses?: string;
};

export function LanguageSearchDropdown({
  defaultValue = "",
  inputClasses = "",
}: LanguageSearchDropdownProps) {
  const initialLanguage =
    LANGUAGES.find((language) => language.value === defaultValue) ?? null;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(initialLanguage?.label ?? "");
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    initialLanguage,
  );

  const filteredLanguages = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return LANGUAGES.filter(
      (language) =>
        language.label.toLowerCase().includes(keyword) ||
        language.value.toLowerCase().includes(keyword),
    );
  }, [search]);

  function selectLanguage(language: Language) {
    setSelectedLanguage(language);
    setSearch(language.label);
    setOpen(false);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelectedLanguage(null);
    setOpen(true);
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);

      if (!selectedLanguage) {
        setSearch("");
      }
    }, 150);
  }

  return (
    <div className="relative">
      <label className="text-sm font-semibold" htmlFor="language-search">
        Language
      </label>

      {/* This is the actual value submitted with the form */}
      <input
        name="language"
        type="hidden"
        value={selectedLanguage?.value ?? ""}
      />

      <input
        autoComplete="off"
        className={inputClasses}
        id="language-search"
        onBlur={handleBlur}
        onChange={(event) => handleSearchChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredLanguages[0]) {
            event.preventDefault();
            selectLanguage(filteredLanguages[0]);
          }

          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search language..."
        required
        role="combobox"
        type="text"
        value={search}
      />

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow">
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map((language) => (
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100"
                key={language.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectLanguage(language)}
                type="button"
              >
                <span>{language.label}</span>
                <span className="text-xs text-gray-500">{language.value}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No language found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
