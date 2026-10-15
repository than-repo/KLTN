import type { LearningFile, LearningLessonDetail } from "../types/learning-course";
import { getYoutubeEmbedUrl } from "../utils/media-url";
import {
  mediaTypeLabels,
  mediaTypeMarks,
  pickPrimaryFile,
} from "../utils/learning-course";

type LessonContentViewerProps = {
  lesson: LearningLessonDetail;
  sectionTitle: string;
};

export function LessonContentViewer({
  lesson,
  sectionTitle,
}: LessonContentViewerProps) {
  const primaryFile = pickPrimaryFile(lesson.files);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{sectionTitle}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {primaryFile ? mediaTypeLabels[primaryFile.type] : "No content"}
          </p>
        </div>
        {primaryFile ? (
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
            href={primaryFile.url}
            rel="noreferrer"
            target="_blank"
          >
            Open source
          </a>
        ) : null}
      </div>

      <div className="bg-[#111827] p-3 sm:p-4">
        <div className="grid min-h-[280px] place-items-center overflow-hidden rounded-md bg-black text-white sm:min-h-[420px]">
          <PrimaryFileViewer file={primaryFile} lessonTitle={lesson.title} />
        </div>
      </div>
    </section>
  );
}

function PrimaryFileViewer({
  file,
  lessonTitle,
}: {
  file: LearningFile | null;
  lessonTitle: string;
}) {
  if (!file) {
    return (
      <EmptyViewer
        message="This lesson does not have learning content yet."
        title={lessonTitle}
      />
    );
  }

  if (file.type === "VIDEO") {
    const youtubeEmbedUrl = getYoutubeEmbedUrl(file.url);

    if (youtubeEmbedUrl) {
      return (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full min-h-[280px] w-full sm:min-h-[420px]"
          referrerPolicy="strict-origin-when-cross-origin"
          src={youtubeEmbedUrl}
          title={lessonTitle}
        />
      );
    }

    return (
      <video
        className="h-full max-h-[70vh] w-full bg-black"
        controls
        preload="metadata"
        src={file.url}
      >
        Your browser does not support the video element.
      </video>
    );
  }

  if (file.type === "AUDIO") {
    return (
      <div className="w-full max-w-2xl px-4 py-10 text-center">
        <MediaMark file={file} />
        <h2 className="mt-4 break-words text-2xl font-semibold leading-tight">
          {lessonTitle}
        </h2>
        <audio className="mt-6 w-full" controls src={file.url} />
      </div>
    );
  }

  if (file.type === "IMAGE") {
    return (
      <div className="w-full p-3">
        {/* Learning media may come from private or unconfigured origins. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={lessonTitle}
          className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
          src={file.url}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl px-4 py-10 text-center">
      <MediaMark file={file} />
      <h2 className="mt-4 break-words text-2xl font-semibold leading-tight">
        {lessonTitle}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/70">
        Open this {mediaTypeLabels[file.type].toLowerCase()} in a new tab to
        continue the lesson.
      </p>
      <a
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-white bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-white/90"
        href={file.url}
        rel="noreferrer"
        target="_blank"
      >
        Open resource
      </a>
    </div>
  );
}

function EmptyViewer({ message, title }: { message: string; title: string }) {
  return (
    <div className="w-full max-w-xl px-4 py-10 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full border border-white/15 bg-white/10 text-xl font-semibold text-white">
        L
      </div>
      <h2 className="mt-4 break-words text-2xl font-semibold leading-tight">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/70">
        {message}
      </p>
    </div>
  );
}

function MediaMark({ file }: { file: LearningFile }) {
  return (
    <div className="mx-auto grid size-16 place-items-center rounded-full border border-white/15 bg-white/10 text-xl font-semibold text-white">
      {mediaTypeMarks[file.type]}
    </div>
  );
}
