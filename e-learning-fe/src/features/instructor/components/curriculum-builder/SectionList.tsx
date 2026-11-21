"use client";

import { useState } from "react";
import { Loader2, ChevronDown, FolderOpen, FileText, AlertCircle, RefreshCw, Upload, Link2, Trash2, Edit2, MoreVertical, X, Check, Plus, Image, Video, File, Music, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Section, Lesson, LessonFileMedia, Skill, MediaType } from "@/features/instructor/types/instructor-course";
import {
  getMediaTypeFromFile,
  inferMediaTypeFromUrl,
  isValidUrl,
  mediaTypeLabels,
  uploadFileToCloudinary,
  getCloudinaryResourceType,
  getFilenameFromUrl,
  type LessonMediaType,
} from "../../utils/lesson-media";
import { getUploadSignature } from "../../api/instructor-lesson-file-api";

interface SectionListProps {
  sections: Section[];
  collapsedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
  onToggleSectionStatus: (section: Section) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onAddLesson: (sectionId: string) => void;
  editingSectionId: string | null;
  onSaveSection: (sectionId: string) => void;
  onCancelEditSection: () => void;
  editSectionTitle: string;
  onEditSectionTitleChange: (title: string) => void;
  editSectionDescription: string;
  onEditSectionDescriptionChange: (description: string) => void;
  canEditCourse: boolean;
  lockedMessage: string;
  // Lazy loading props
  sectionLessonsLoading: Record<string, boolean>;
  sectionLessonsError: Record<string, string>;
  onLoadSectionLessons: (sectionId: string) => void;
  onRetryLoadSectionLessons: (sectionId: string) => void;
  // Lesson management props
  uploadedFiles: Record<string, LessonFileMedia[]>;
  editingLessonId: string | null;
  setEditingLessonId: (id: string | null) => void;
  editLessonTitle: string;
  setEditLessonTitle: (title: string) => void;
  editLessonDescription: string;
  setEditLessonDescription: (description: string) => void;
  onUpdateLesson: (sectionId: string, lessonId: string) => void;
  onToggleLesson: (sectionId: string, lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson, sectionId: string) => void;
  onMoveLesson: (sectionId: string, lessonId: string, direction: "up" | "down") => void;
  onAssignSkill: (sectionId: string, lesson: Lesson) => void;
  skillDialogLesson: Lesson | null;
  setSkillDialogLesson: (lesson: Lesson | null) => void;
  // Media management props
  mediaLinkForms: Record<string, { filename: string; url: string }>;
  setMediaLinkForms: React.Dispatch<React.SetStateAction<Record<string, { filename: string; url: string }>>>;
  savingMediaLinkLessonId: string | null;
  onAttachLessonMediaUrl: (sectionId: string, lesson: Lesson) => void;
  pendingUpload: { file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null;
  setPendingUpload: React.Dispatch<React.SetStateAction<{ file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null>>;
  uploading: { lessonId: string; progressText: string } | null;
  onSelectLessonFile: (sectionId: string, lesson: Lesson, file: File) => void;
  cancelPendingUpload: () => void;
  onConfirmUploadLessonFile: () => void;
  editingFile: { file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null;
  setEditingFile: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null>>;
  savingFileEdit: boolean;
  onUpdateFileMedia: () => void;
  fileToDelete: { file: LessonFileMedia; lessonId: string; sectionId: string } | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; lessonId: string; sectionId: string } | null>>;
  deletingFile: boolean;
  onConfirmDeleteFileMedia: () => void;
}

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

function getDefaultMediaLinkForm() {
  return { filename: "", url: "" };
}

export function SectionList({
  sections,
  collapsedSections,
  onToggleSection,
  onEditSection,
  onDeleteSection,
  onToggleSectionStatus,
  onMoveSection,
  onAddLesson,
  editingSectionId,
  onSaveSection,
  onCancelEditSection,
  editSectionTitle,
  onEditSectionTitleChange,
  editSectionDescription,
  onEditSectionDescriptionChange,
  canEditCourse,
  lockedMessage,
  sectionLessonsLoading,
  sectionLessonsError,
  onLoadSectionLessons,
  onRetryLoadSectionLessons,
  uploadedFiles,
  editingLessonId,
  setEditingLessonId,
  editLessonTitle,
  setEditLessonTitle,
  editLessonDescription,
  setEditLessonDescription,
  onUpdateLesson,
  onToggleLesson,
  onDeleteLesson,
  onMoveLesson,
  onAssignSkill,
  skillDialogLesson,
  setSkillDialogLesson,
  mediaLinkForms,
  setMediaLinkForms,
  savingMediaLinkLessonId,
  onAttachLessonMediaUrl,
  pendingUpload,
  setPendingUpload,
  uploading,
  onSelectLessonFile,
  cancelPendingUpload,
  onConfirmUploadLessonFile,
  editingFile,
  setEditingFile,
  savingFileEdit,
  onUpdateFileMedia,
  fileToDelete,
  setFileToDelete,
  deletingFile,
  onConfirmDeleteFileMedia,
}: SectionListProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
        <p className="text-lg font-semibold">No sections yet</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Create your first section to start structuring this course.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {sections.map((section, sectionIndex) => (
        <SectionItem
          key={section.id}
          section={section}
          sectionIndex={sectionIndex}
          totalSections={sections.length}
          isCollapsed={collapsedSections[section.id] ?? false}
          isEditing={editingSectionId === section.id}
          canEditCourse={canEditCourse}
          lockedMessage={lockedMessage}
          onToggleCollapse={onToggleSection}
          onEdit={onEditSection}
          onDelete={onDeleteSection}
          onToggleStatus={onToggleSectionStatus}
          onMove={onMoveSection}
          onAddLesson={onAddLesson}
          onSave={onSaveSection}
          onCancel={onCancelEditSection}
          editTitle={editSectionTitle}
          onEditTitleChange={onEditSectionTitleChange}
          editDescription={editSectionDescription}
          onEditDescriptionChange={onEditSectionDescriptionChange}
          // Lazy loading
          isLoadingLessons={sectionLessonsLoading[section.id] ?? false}
          lessonsError={sectionLessonsError[section.id]}
          hasLessonsLoaded={!!section.lessons}
          onLoadLessons={onLoadSectionLessons}
          onRetryLoadLessons={onRetryLoadSectionLessons}
          // Lesson management
          uploadedFiles={uploadedFiles}
          editingLessonId={editingLessonId}
          setEditingLessonId={setEditingLessonId}
          editLessonTitle={editLessonTitle}
          setEditLessonTitle={setEditLessonTitle}
          editLessonDescription={editLessonDescription}
          setEditLessonDescription={setEditLessonDescription}
          onUpdateLesson={onUpdateLesson}
          onToggleLesson={onToggleLesson}
          onDeleteLesson={onDeleteLesson}
          onMoveLesson={onMoveLesson}
          onAssignSkill={onAssignSkill}
          skillDialogLesson={skillDialogLesson}
          setSkillDialogLesson={setSkillDialogLesson}
          // Media management
          mediaLinkForms={mediaLinkForms}
          setMediaLinkForms={setMediaLinkForms}
          savingMediaLinkLessonId={savingMediaLinkLessonId}
          onAttachLessonMediaUrl={onAttachLessonMediaUrl}
          pendingUpload={pendingUpload}
          setPendingUpload={setPendingUpload}
          uploading={uploading}
          onSelectLessonFile={onSelectLessonFile}
          cancelPendingUpload={cancelPendingUpload}
          onConfirmUploadLessonFile={onConfirmUploadLessonFile}
          editingFile={editingFile}
          setEditingFile={setEditingFile}
          savingFileEdit={savingFileEdit}
          onUpdateFileMedia={onUpdateFileMedia}
          fileToDelete={fileToDelete}
          setFileToDelete={setFileToDelete}
          deletingFile={deletingFile}
          onConfirmDeleteFileMedia={onConfirmDeleteFileMedia}
        />
      ))}
    </div>
  );
}

function SectionItem({
  section,
  sectionIndex,
  totalSections,
  isCollapsed,
  isEditing,
  canEditCourse,
  lockedMessage,
  onToggleCollapse,
  onEdit,
  onDelete,
  onToggleStatus,
  onMove,
  onAddLesson,
  onSave,
  onCancel,
  editTitle,
  onEditTitleChange,
  editDescription,
  onEditDescriptionChange,
  isLoadingLessons,
  lessonsError,
  hasLessonsLoaded,
  onLoadLessons,
  onRetryLoadLessons,
  uploadedFiles,
  editingLessonId,
  setEditingLessonId,
  editLessonTitle,
  setEditLessonTitle,
  editLessonDescription,
  setEditLessonDescription,
  onUpdateLesson,
  onToggleLesson,
  onDeleteLesson,
  onMoveLesson,
  onAssignSkill,
  skillDialogLesson,
  setSkillDialogLesson,
  mediaLinkForms,
  setMediaLinkForms,
  savingMediaLinkLessonId,
  onAttachLessonMediaUrl,
  pendingUpload,
  setPendingUpload,
  uploading,
  onSelectLessonFile,
  cancelPendingUpload,
  onConfirmUploadLessonFile,
  editingFile,
  setEditingFile,
  savingFileEdit,
  onUpdateFileMedia,
  fileToDelete,
  setFileToDelete,
  deletingFile,
  onConfirmDeleteFileMedia,
}: {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  isCollapsed: boolean;
  isEditing: boolean;
  canEditCourse: boolean;
  lockedMessage: string;
  onToggleCollapse: (sectionId: string) => void;
  onEdit: (section: Section) => void;
  onDelete: (section: Section) => void;
  onToggleStatus: (section: Section) => void;
  onMove: (sectionId: string, direction: "up" | "down") => void;
  onAddLesson: (sectionId: string) => void;
  onSave: (sectionId: string) => void;
  onCancel: () => void;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  editDescription: string;
  onEditDescriptionChange: (description: string) => void;
  isLoadingLessons: boolean;
  lessonsError: string | undefined;
  hasLessonsLoaded: boolean;
  onLoadLessons: (sectionId: string) => void;
  onRetryLoadLessons: (sectionId: string) => void;
  uploadedFiles: Record<string, LessonFileMedia[]>;
  editingLessonId: string | null;
  setEditingLessonId: (id: string | null) => void;
  editLessonTitle: string;
  setEditLessonTitle: (title: string) => void;
  editLessonDescription: string;
  setEditLessonDescription: (description: string) => void;
  onUpdateLesson: (sectionId: string, lessonId: string) => void;
  onToggleLesson: (sectionId: string, lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson, sectionId: string) => void;
  onMoveLesson: (sectionId: string, lessonId: string, direction: "up" | "down") => void;
  onAssignSkill: (sectionId: string, lesson: Lesson) => void;
  skillDialogLesson: Lesson | null;
  setSkillDialogLesson: (lesson: Lesson | null) => void;
  mediaLinkForms: Record<string, { filename: string; url: string }>;
  setMediaLinkForms: React.Dispatch<React.SetStateAction<Record<string, { filename: string; url: string }>>>;
  savingMediaLinkLessonId: string | null;
  onAttachLessonMediaUrl: (sectionId: string, lesson: Lesson) => void;
  pendingUpload: { file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null;
  setPendingUpload: React.Dispatch<React.SetStateAction<{ file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null>>;
  uploading: { lessonId: string; progressText: string } | null;
  onSelectLessonFile: (sectionId: string, lesson: Lesson, file: File) => void;
  cancelPendingUpload: () => void;
  onConfirmUploadLessonFile: () => void;
  editingFile: { file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null;
  setEditingFile: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null>>;
  savingFileEdit: boolean;
  onUpdateFileMedia: () => void;
  fileToDelete: { file: LessonFileMedia; lessonId: string; sectionId: string } | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; lessonId: string; sectionId: string } | null>>;
  deletingFile: boolean;
  onConfirmDeleteFileMedia: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <button
          aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-3 text-sm font-semibold"
          onClick={() => onToggleCollapse(section.id)}
          type="button"
        >
          {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronDown className="size-4 rotate-180" />}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="grid gap-3">
              <input
                className={fieldClasses}
                onChange={(event) => onEditTitleChange(event.target.value)}
                placeholder="Section title"
                value={editTitle}
              />
              <textarea
                className={fieldClasses}
                onChange={(event) => onEditDescriptionChange(event.target.value)}
                placeholder="Section description (optional)"
                rows={2}
                value={editDescription}
              />
              <div className="flex gap-2">
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  onClick={() => onSave(section.id)}
                  type="button"
                >
                  Save
                </button>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold"
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="line-clamp-1 text-lg font-semibold">
                Section {sectionIndex + 1}: {section.title}
              </h3>
              {section.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {section.description}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                    section.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-neutral-50 text-neutral-700 border-neutral-200"
                  }`}
                >
                  {section.isActive ? "Active" : "Disabled"}
                </span>
                <span
                  className="inline-flex items-center rounded-md border border-border bg-surface-pearl px-2 py-1 text-xs font-semibold"
                >
                  {section.lessons?.length ?? 0} lesson
                  {(section.lessons?.length ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
            </>
          )}
        </div>

        {!isEditing ? (
          <div className="flex flex-wrap gap-2">
            <MiniButton
              disabled={!canEditCourse || sectionIndex === 0}
              label="Up"
              onClick={() => onMove(section.id, "up")}
            />
            <MiniButton
              disabled={!canEditCourse || sectionIndex === totalSections - 1}
              label="Down"
              onClick={() => onMove(section.id, "down")}
            />
            <MiniButton
              disabled={!canEditCourse}
              label="Rename"
              onClick={() => onEdit(section)}
            />
            <MiniButton
              disabled={!canEditCourse}
              label={section.isActive ? "Disable" : "Enable"}
              onClick={() => onToggleStatus(section)}
            />
            <MiniButton
              danger
              disabled={!canEditCourse}
              label="Delete"
              onClick={() => onDelete(section)}
            />
          </div>
        ) : null}
      </div>
      {!isCollapsed ? (
        <div className="p-4">
          <SectionLessons
            section={section}
            sectionIndex={sectionIndex}
            canEditCourse={canEditCourse}
            lockedMessage={lockedMessage}
            onAddLesson={onAddLesson}
            isLoadingLessons={isLoadingLessons}
            lessonsError={lessonsError}
            hasLessonsLoaded={hasLessonsLoaded}
            onLoadLessons={onLoadLessons}
            onRetryLoadLessons={onRetryLoadLessons}
            uploadedFiles={uploadedFiles}
            editingLessonId={editingLessonId}
            setEditingLessonId={setEditingLessonId}
            editLessonTitle={editLessonTitle}
            setEditLessonTitle={setEditLessonTitle}
            editLessonDescription={editLessonDescription}
            setEditLessonDescription={setEditLessonDescription}
            onUpdateLesson={onUpdateLesson}
            onToggleLesson={onToggleLesson}
            onDeleteLesson={onDeleteLesson}
            onMoveLesson={onMoveLesson}
            onAssignSkill={onAssignSkill}
            skillDialogLesson={skillDialogLesson}
            setSkillDialogLesson={setSkillDialogLesson}
            mediaLinkForms={mediaLinkForms}
            setMediaLinkForms={setMediaLinkForms}
            savingMediaLinkLessonId={savingMediaLinkLessonId}
            onAttachLessonMediaUrl={onAttachLessonMediaUrl}
            pendingUpload={pendingUpload}
            setPendingUpload={setPendingUpload}
            uploading={uploading}
            onSelectLessonFile={onSelectLessonFile}
            cancelPendingUpload={cancelPendingUpload}
            onConfirmUploadLessonFile={onConfirmUploadLessonFile}
            editingFile={editingFile}
            setEditingFile={setEditingFile}
            savingFileEdit={savingFileEdit}
            onUpdateFileMedia={onUpdateFileMedia}
            fileToDelete={fileToDelete}
            setFileToDelete={setFileToDelete}
            deletingFile={deletingFile}
            onConfirmDeleteFileMedia={onConfirmDeleteFileMedia}
          />
        </div>
      ) : null}
    </section>
  );
}

function SectionLessons({
  section,
  sectionIndex,
  canEditCourse,
  lockedMessage,
  onAddLesson,
  isLoadingLessons,
  lessonsError,
  hasLessonsLoaded,
  onLoadLessons,
  onRetryLoadLessons,
  uploadedFiles,
  editingLessonId,
  setEditingLessonId,
  editLessonTitle,
  setEditLessonTitle,
  editLessonDescription,
  setEditLessonDescription,
  onUpdateLesson,
  onToggleLesson,
  onDeleteLesson,
  onMoveLesson,
  onAssignSkill,
  skillDialogLesson,
  setSkillDialogLesson,
  mediaLinkForms,
  setMediaLinkForms,
  savingMediaLinkLessonId,
  onAttachLessonMediaUrl,
  pendingUpload,
  setPendingUpload,
  uploading,
  onSelectLessonFile,
  cancelPendingUpload,
  onConfirmUploadLessonFile,
  editingFile,
  setEditingFile,
  savingFileEdit,
  onUpdateFileMedia,
  fileToDelete,
  setFileToDelete,
  deletingFile,
  onConfirmDeleteFileMedia,
}: {
  section: Section;
  sectionIndex: number;
  canEditCourse: boolean;
  lockedMessage: string;
  onAddLesson: (sectionId: string) => void;
  isLoadingLessons: boolean;
  lessonsError: string | undefined;
  hasLessonsLoaded: boolean;
  onLoadLessons: (sectionId: string) => void;
  onRetryLoadLessons: (sectionId: string) => void;
  uploadedFiles: Record<string, LessonFileMedia[]>;
  editingLessonId: string | null;
  setEditingLessonId: (id: string | null) => void;
  editLessonTitle: string;
  setEditLessonTitle: (title: string) => void;
  editLessonDescription: string;
  setEditLessonDescription: (description: string) => void;
  onUpdateLesson: (sectionId: string, lessonId: string) => void;
  onToggleLesson: (sectionId: string, lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson, sectionId: string) => void;
  onMoveLesson: (sectionId: string, lessonId: string, direction: "up" | "down") => void;
  onAssignSkill: (sectionId: string, lesson: Lesson) => void;
  skillDialogLesson: Lesson | null;
  setSkillDialogLesson: (lesson: Lesson | null) => void;
  mediaLinkForms: Record<string, { filename: string; url: string }>;
  setMediaLinkForms: React.Dispatch<React.SetStateAction<Record<string, { filename: string; url: string }>>>;
  savingMediaLinkLessonId: string | null;
  onAttachLessonMediaUrl: (sectionId: string, lesson: Lesson) => void;
  pendingUpload: { file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null;
  setPendingUpload: React.Dispatch<React.SetStateAction<{ file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null>>;
  uploading: { lessonId: string; progressText: string } | null;
  onSelectLessonFile: (sectionId: string, lesson: Lesson, file: File) => void;
  cancelPendingUpload: () => void;
  onConfirmUploadLessonFile: () => void;
  editingFile: { file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null;
  setEditingFile: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null>>;
  savingFileEdit: boolean;
  onUpdateFileMedia: () => void;
  fileToDelete: { file: LessonFileMedia; lessonId: string; sectionId: string } | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; lessonId: string; sectionId: string } | null>>;
  deletingFile: boolean;
  onConfirmDeleteFileMedia: () => void;
}) {
  // Show loading state
  if (isLoadingLessons) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading lessons...</span>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (lessonsError) {
    return (
      <div className="rounded-md border border-danger/20 bg-danger/5 p-4">
        <div className="flex items-center gap-2 text-danger mb-2">
          <AlertCircle className="size-5" />
          <span className="font-semibold">Failed to load lessons</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{lessonsError}</p>
        <button
          className="inline-flex items-center gap-2 min-h-9 rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground"
          onClick={() => onRetryLoadLessons(section.id)}
          type="button"
        >
          <RefreshCw className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  // Not loaded yet - show Load Lessons button
  if (!hasLessonsLoaded) {
    return (
      <div className="flex items-center justify-center py-8 border-t border-border">
        <button
          className="inline-flex items-center gap-2 min-h-10 rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          onClick={() => onLoadLessons(section.id)}
          type="button"
        >
          <FolderOpen className="size-4" />
          Load Lessons
        </button>
      </div>
    );
  }

  // Lessons loaded - render them
  if (!section.lessons || section.lessons.length === 0) {
    return (
      <>
        <p className="text-sm text-muted-foreground">No lessons in this section yet.</p>
        <button
          className="mt-4 inline-flex items-center justify-center min-h-11 rounded-md border border-dashed border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canEditCourse}
          onClick={() => onAddLesson(section.id)}
          type="button"
        >
          <FileText className="size-4 mr-2" />
          Add Lesson
        </button>
      </>
    );
  }

  return (
    <>
      <ol className="grid gap-3">
        {section.lessons?.map((lesson, lessonIndex) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            lessonIndex={lessonIndex}
            sectionIndex={sectionIndex}
            sectionId={section.id}
            sectionLessonsCount={section.lessons?.length ?? 0}
            canEditCourse={canEditCourse}
            lockedMessage={lockedMessage}
            uploadedFiles={uploadedFiles}
            editingLessonId={editingLessonId}
            setEditingLessonId={setEditingLessonId}
            editLessonTitle={editLessonTitle}
            setEditLessonTitle={setEditLessonTitle}
            editLessonDescription={editLessonDescription}
            setEditLessonDescription={setEditLessonDescription}
            onUpdateLesson={onUpdateLesson}
            onToggleLesson={onToggleLesson}
            onDeleteLesson={onDeleteLesson}
            onMoveLesson={onMoveLesson}
            onAssignSkill={onAssignSkill}
            skillDialogLesson={skillDialogLesson}
            setSkillDialogLesson={setSkillDialogLesson}
            mediaLinkForms={mediaLinkForms}
            setMediaLinkForms={setMediaLinkForms}
            savingMediaLinkLessonId={savingMediaLinkLessonId}
            onAttachLessonMediaUrl={onAttachLessonMediaUrl}
            pendingUpload={pendingUpload}
            setPendingUpload={setPendingUpload}
            uploading={uploading}
            onSelectLessonFile={onSelectLessonFile}
            cancelPendingUpload={cancelPendingUpload}
            onConfirmUploadLessonFile={onConfirmUploadLessonFile}
            editingFile={editingFile}
            setEditingFile={setEditingFile}
            savingFileEdit={savingFileEdit}
            onUpdateFileMedia={onUpdateFileMedia}
            fileToDelete={fileToDelete}
            setFileToDelete={setFileToDelete}
            deletingFile={deletingFile}
            onConfirmDeleteFileMedia={onConfirmDeleteFileMedia}
          />
        ))}
      </ol>
      <button
        className="mt-4 inline-flex items-center justify-center min-h-11 rounded-md border border-dashed border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canEditCourse}
        onClick={() => onAddLesson(section.id)}
        type="button"
      >
        <FileText className="size-4 mr-2" />
        Add Lesson
      </button>
    </>
  );
}

function LessonItem({
  lesson,
  lessonIndex,
  sectionIndex,
  sectionId,
  sectionLessonsCount,
  canEditCourse,
  lockedMessage,
  uploadedFiles,
  editingLessonId,
  setEditingLessonId,
  editLessonTitle,
  setEditLessonTitle,
  editLessonDescription,
  setEditLessonDescription,
  onUpdateLesson,
  onToggleLesson,
  onDeleteLesson,
  onMoveLesson,
  onAssignSkill,
  skillDialogLesson,
  setSkillDialogLesson,
  mediaLinkForms,
  setMediaLinkForms,
  savingMediaLinkLessonId,
  onAttachLessonMediaUrl,
  pendingUpload,
  setPendingUpload,
  uploading,
  onSelectLessonFile,
  cancelPendingUpload,
  onConfirmUploadLessonFile,
  editingFile,
  setEditingFile,
  savingFileEdit,
  onUpdateFileMedia,
  fileToDelete,
  setFileToDelete,
  deletingFile,
  onConfirmDeleteFileMedia,
}: {
  lesson: Lesson;
  lessonIndex: number;
  sectionIndex: number;
  sectionId: string;
  sectionLessonsCount: number;
  canEditCourse: boolean;
  lockedMessage: string;
  uploadedFiles: Record<string, LessonFileMedia[]>;
  editingLessonId: string | null;
  setEditingLessonId: (id: string | null) => void;
  editLessonTitle: string;
  setEditLessonTitle: (title: string) => void;
  editLessonDescription: string;
  setEditLessonDescription: (description: string) => void;
  onUpdateLesson: (sectionId: string, lessonId: string) => void;
  onToggleLesson: (sectionId: string, lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson, sectionId: string) => void;
  onMoveLesson: (sectionId: string, lessonId: string, direction: "up" | "down") => void;
  onAssignSkill: (sectionId: string, lesson: Lesson) => void;
  skillDialogLesson: Lesson | null;
  setSkillDialogLesson: (lesson: Lesson | null) => void;
  mediaLinkForms: Record<string, { filename: string; url: string }>;
  setMediaLinkForms: React.Dispatch<React.SetStateAction<Record<string, { filename: string; url: string }>>>;
  savingMediaLinkLessonId: string | null;
  onAttachLessonMediaUrl: (sectionId: string, lesson: Lesson) => void;
  pendingUpload: { file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null;
  setPendingUpload: React.Dispatch<React.SetStateAction<{ file: File; lesson: Lesson; mediaType: LessonMediaType; previewUrl: string | null; sectionId: string } | null>>;
  uploading: { lessonId: string; progressText: string } | null;
  onSelectLessonFile: (sectionId: string, lesson: Lesson, file: File) => void;
  cancelPendingUpload: () => void;
  onConfirmUploadLessonFile: () => void;
  editingFile: { file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null;
  setEditingFile: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; form: { cloudinaryPublicId: string; filename: string; mimeType: string; sizeInBytes: string; type: LessonMediaType; url: string }; lessonId: string; sectionId: string } | null>>;
  savingFileEdit: boolean;
  onUpdateFileMedia: () => void;
  fileToDelete: { file: LessonFileMedia; lessonId: string; sectionId: string } | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<{ file: LessonFileMedia; lessonId: string; sectionId: string } | null>>;
  deletingFile: boolean;
  onConfirmDeleteFileMedia: () => void;
}) {
  const isEditing = editingLessonId === lesson.id;
  const lessonFiles = uploadedFiles[lesson.id] ?? [];

  return (
    <li className="rounded-md border border-border bg-surface-pearl p-4">
      {isEditing ? (
        <div className="grid gap-3">
          <input
            className={fieldClasses}
            onChange={(event) => setEditLessonTitle(event.target.value)}
            placeholder="Lesson title"
            value={editLessonTitle}
          />
          <textarea
            className={fieldClasses}
            onChange={(event) => setEditLessonDescription(event.target.value)}
            placeholder="Lesson description (optional)"
            rows={2}
            value={editLessonDescription}
          />
          <div className="flex gap-2">
            <MiniButton
              primary
              label="Save"
              onClick={() => onUpdateLesson(sectionId, lesson.id)}
            />
            <MiniButton label="Cancel" onClick={() => setEditingLessonId(null)} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-ink-muted">
                Lesson {sectionIndex + 1}.{lessonIndex + 1}
              </p>
              <p className="mt-1 line-clamp-1 font-semibold">{lesson.title}</p>
              {lesson.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {lesson.description}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                    lesson.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-neutral-50 text-neutral-700 border-neutral-200"
                  }`}
                >
                  {lesson.isActive ? "Active" : "Disabled"}
                </span>
                <span className="inline-flex items-center rounded-md border border-border bg-surface-pearl px-2 py-1 text-xs font-semibold">
                  {lessonFiles.length} media
                </span>
                {(lesson.skills ?? []).map((skill) => (
                  <div key={skill.id} className="inline-flex items-center gap-1">
                    <Badge
                      variant="action"
                      title={skill.canonicalName}
                      className={
                        skill.difficulty === "EASY"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"
                          : skill.difficulty === "MEDIUM"
                          ? "bg-amber-50 text-amber-700 border-amber-200 gap-1"
                          : "bg-rose-50 text-rose-700 border-rose-200 gap-1"
                      }
                    >
                      {skill.canonicalName}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <MiniButton
                disabled={!canEditCourse || lessonIndex === 0}
                label="Up"
                onClick={() => onMoveLesson(sectionId, lesson.id, "up")}
              />
              <MiniButton
                disabled={!canEditCourse || lessonIndex === sectionLessonsCount - 1}
                label="Down"
                onClick={() => onMoveLesson(sectionId, lesson.id, "down")}
              />
              <MiniButton
                disabled={!canEditCourse}
                label="Edit"
                onClick={() => setEditingLessonId(lesson.id)}
              />
              <MiniButton
                disabled={!canEditCourse}
                label="Assign skill"
                onClick={() => setSkillDialogLesson({ ...lesson, sectionId })}
              />
              <MiniButton
                disabled={!canEditCourse}
                label={lesson.isActive ? "Disable" : "Enable"}
                onClick={() => onToggleLesson(sectionId, lesson)}
              />
              <MiniButton
                danger
                disabled={!canEditCourse}
                label="Delete"
                onClick={() => onDeleteLesson(lesson, sectionId)}
              />
            </div>
          </div>

          {/* Media Files */}
          <div className="mt-4 border-t border-border pt-3">
            {lessonFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No media attached to this lesson.</p>
            ) : (
              <ul className="grid gap-2">
                {lessonFiles.map((file) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                    key={file.id}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <MediaIcon type={file.type} />
                      <div>
                        <p className="line-clamp-1 font-medium">{file.filename || "Untitled file"}</p>
                        <p className="text-xs text-muted-foreground">
                          {mediaTypeLabels[file.type] ?? file.type} ·{" "}
                          {formatFileSize(file.sizeInBytes)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <MiniButton
                        disabled={!canEditCourse}
                        label="Edit"
                        onClick={() => setEditingFile({ file, form: { cloudinaryPublicId: file.cloudinaryPublicId || "", filename: file.filename || "", mimeType: file.mimeType || "", sizeInBytes: file.sizeInBytes === undefined || file.sizeInBytes === null ? "" : String(file.sizeInBytes), type: file.type, url: file.url || "" }, lessonId: lesson.id, sectionId })}
                      />
                      <MiniButton
                        danger
                        disabled={!canEditCourse}
                        label="Remove"
                        onClick={() => setFileToDelete({ file, lessonId: lesson.id, sectionId })}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add Media Form */}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label
                className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                htmlFor={`upload-${lesson.id}`}
              >
                <Upload className="size-4 mr-1" />
                Upload file
              </label>
              <input
                accept="*/*"
                className="hidden"
                disabled={!canEditCourse}
                id={`upload-${lesson.id}`}
                onChange={(
                  event: React.ChangeEvent<HTMLInputElement>,
                ) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onSelectLessonFile(sectionId, lesson, file);
                  }
                  event.target.value = "";
                }}
                type="file"
              />

              <input
                className="min-h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary min-w-[200px]"
                onChange={(event) =>
                  setMediaLinkForms((prev) => ({
                    ...prev,
                    [lesson.id]: { ...(prev[lesson.id] ?? getDefaultMediaLinkForm()), url: event.target.value },
                  }))
                }
                placeholder="https://example.com/video.mp4"
                value={mediaLinkForms[lesson.id]?.url ?? ""}
              />
              <input
                className="min-h-9 w-40 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                onChange={(event) =>
                  setMediaLinkForms((prev) => ({
                    ...prev,
                    [lesson.id]: { ...(prev[lesson.id] ?? getDefaultMediaLinkForm()), filename: event.target.value },
                  }))
                }
                placeholder="Filename (optional)"
                value={mediaLinkForms[lesson.id]?.filename ?? ""}
              />
              <MiniButton
                disabled={!canEditCourse || savingMediaLinkLessonId === lesson.id}
                primary
                label={savingMediaLinkLessonId === lesson.id ? "Adding..." : "Add link"}
                onClick={() => onAttachLessonMediaUrl(sectionId, lesson)}
              />
            </div>
            {uploading?.lessonId === lesson.id ? (
              <p className="mt-2 text-xs text-primary">{uploading.progressText}</p>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

function MediaIcon({ type }: { type: MediaType }) {
  const icons = {
    IMAGE: Image,
    VIDEO: Video,
    AUDIO: Music,
    DOCUMENT: File,
    OTHER: FileQuestion,
  };
  const Icon = icons[type] || FileQuestion;
  return <Icon className="size-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type MiniButtonProps = {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  primary?: boolean;
};

function MiniButton({
  danger = false,
  disabled = false,
  label,
  onClick,
  primary = false,
}: MiniButtonProps) {
  const classes = primary
    ? "border-primary bg-primary text-primary-foreground hover:bg-primary-focus"
    : danger
    ? "border-danger/40 bg-card text-danger hover:bg-danger/10"
    : "border-border bg-card text-foreground hover:border-primary hover:text-primary";

  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}