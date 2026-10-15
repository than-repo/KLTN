"use client";

import { useState } from "react";

import type { LearningFile, LearningLessonDetail } from "../types/learning-course";
import {
  mediaTypeClasses,
  mediaTypeLabels,
  mediaTypeMarks,
} from "../utils/learning-course";

type LearningTab = "overview" | "resources";

type LessonTabsProps = {
  lesson: LearningLessonDetail;
};

export function LessonTabs({ lesson }: LessonTabsProps) {
  const [activeTab, setActiveTab] = useState<LearningTab>("overview");

  return (
    <section className="mb-20 rounded-lg border border-border bg-card shadow-sm lg:mb-0">
      <div
        aria-label="Lesson details"
        className="flex gap-2 border-b border-border bg-background p-3"
        role="tablist"
      >
        <TabButton
          isActive={activeTab === "overview"}
          label="Overview"
          onClick={() => setActiveTab("overview")}
        />
        <TabButton
          isActive={activeTab === "resources"}
          label="Resources"
          onClick={() => setActiveTab("resources")}
        />
      </div>

      <div className="p-4 sm:p-5">
        {activeTab === "overview" ? (
          <LessonOverview lesson={lesson} />
        ) : (
          <LessonResources files={lesson.files} />
        )}
      </div>
    </section>
  );
}

function TabButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={isActive}
      className={[
        "min-h-10 rounded-md border px-4 text-sm font-semibold transition-colors",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary hover:text-primary",
      ].join(" ")}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

function LessonOverview({ lesson }: { lesson: LearningLessonDetail }) {
  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-xl font-semibold leading-tight">Lesson overview</h3>
        <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-muted-foreground">
          {lesson.description ??
            "Use the lesson viewer above and the resources tab to access the files for this lesson."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OverviewFact label="Attached files" value={`${lesson.files.length}`} />
        <OverviewFact
          label="Primary content"
          value={
            lesson.files[0] ? mediaTypeLabels[lesson.files[0].type] : "None"
          }
        />
      </div>
    </div>
  );
}

function OverviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-pearl p-4">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold">{value}</p>
    </div>
  );
}

function LessonResources({ files }: { files: LearningFile[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface-pearl px-4 py-8 text-center">
        <h3 className="text-xl font-semibold leading-tight">No resources</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          No resources have been added for this lesson.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold leading-tight">Lesson resources</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {files.map((file, index) => (
          <ResourceCard file={file} index={index} key={file.id} />
        ))}
      </div>
    </div>
  );
}

function ResourceCard({ file, index }: { file: LearningFile; index: number }) {
  return (
    <a
      className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary hover:text-primary"
      href={file.url}
      rel="noreferrer"
      target="_blank"
    >
      <span
        className={[
          "grid size-10 place-items-center rounded-md border text-sm font-semibold",
          mediaTypeClasses[file.type],
        ].join(" ")}
      >
        {mediaTypeMarks[file.type]}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">
          {mediaTypeLabels[file.type]} {index + 1}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          Open resource
        </span>
      </span>
    </a>
  );
}
