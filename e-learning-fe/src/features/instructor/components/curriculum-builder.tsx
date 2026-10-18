"use client";

import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  createInstructorCourseSection,
  deleteInstructorCourseSection,
  getInstructorCourseSections,
  getInstructorCourses,
  reorderInstructorCourseSections,
  updateInstructorCourseSection,
  updateInstructorCourseSectionStatus,
} from "../api/instructor-course-api";
import {
  createInstructorCourseLesson,
  deleteInstructorCourseLesson,
  getInstructorCourseLessons,
  reorderInstructorCourseLessons,
  updateInstructorCourseLesson,
} from "../api/instructor-lesson-api";
import {
  createInstructorLessonFile,
  deleteInstructorLessonFile,
  getInstructorLessonFiles,
  getUploadSignature,
  updateInstructorLessonFile,
} from "../api/instructor-lesson-file-api";
import type {
  InstructorCourse,
  Lesson,
  LessonFileMedia,
  MediaType,
  Section,
} from "../types/instructor-course";
import { isCourseEditable } from "../utils/course-status";
import { formatFileSize, getErrorMessage } from "../utils/instructor-format";
import {
  getCloudinaryResourceType,
  getFilenameFromUrl,
  getMediaTypeFromFile,
  inferMediaTypeFromUrl,
  isValidUrl,
  mediaTypeLabels,
  uploadFileToCloudinary,
  type LessonMediaType,
} from "../utils/lesson-media";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20";

type UploadingState = {
  lessonId: string;
  progressText: string;
} | null;

type PendingUpload = {
  file: File;
  lesson: Lesson;
  mediaType: LessonMediaType;
  previewUrl: string | null;
  sectionId: string;
} | null;

type MediaLinkForm = {
  filename: string;
  url: string;
};

type LessonDraftForm = {
  description: string;
  file: File | null;
  fileMediaType: LessonMediaType | null;
  filePreviewUrl: string | null;
  mediaFilename: string;
  mediaUrl: string;
  title: string;
};

type FileEditState = {
  file: LessonFileMedia;
  form: {
    cloudinaryPublicId: string;
    filename: string;
    mimeType: string;
    sizeInBytes: string;
    type: LessonMediaType;
    url: string;
  };
  lessonId: string;
  sectionId: string;
} | null;

type FileDeleteState = {
  file: LessonFileMedia;
  lessonId: string;
  sectionId: string;
} | null;

function getDefaultMediaLinkForm(): MediaLinkForm {
  return { filename: "", url: "" };
}

function getDefaultLessonDraftForm(): LessonDraftForm {
  return {
    description: "",
    file: null,
    fileMediaType: null,
    filePreviewUrl: null,
    mediaFilename: "",
    mediaUrl: "",
    title: "",
  };
}
export function CurriculumBuilder() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { accessToken, status } = useAuth();

  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Record<string, LessonFileMedia[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<UploadingState>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload>(null);

  const [mediaLinkForms, setMediaLinkForms] = useState<
    Record<string, MediaLinkForm>
  >({});
  const [savingMediaLinkLessonId, setSavingMediaLinkLessonId] = useState<
    string | null
  >(null);

  const [editingFile, setEditingFile] = useState<FileEditState>(null);
  const [savingFileEdit, setSavingFileEdit] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileDeleteState>(null);
  const [deletingFile, setDeletingFile] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionDescription, setEditSectionDescription] = useState("");

  const [lessonFormSectionId, setLessonFormSectionId] = useState<string | null>(
    null,
  );
  const [lessonDraftForm, setLessonDraftForm] = useState<LessonDraftForm>(
    getDefaultLessonDraftForm(),
  );
  const [creatingLessonSectionId, setCreatingLessonSectionId] = useState<
    string | null
  >(null);

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonDescription, setEditLessonDescription] = useState("");

  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{
    lesson: Lesson;
    sectionId: string;
  } | null>(null);

  const canEditCourse = isCourseEditable(course?.status);
  const lockedMessage =
    "This course is locked because it is under review, approved, or published.";

  const curriculumSummary = useMemo(() => {
    const totalSections = sections.length;
    const totalLessons = sections.reduce(
      (sum, section) => sum + (section.lessons?.length ?? 0),
      0,
    );
    const activeSections = sections.filter(
      (section) => section.isActive,
    ).length;
    const totalMedia = Object.values(uploadedFiles).reduce(
      (sum, files) => sum + files.length,
      0,
    );

    return {
      activeSections,
      inactiveSections: totalSections - activeSections,
      totalLessons,
      totalMedia,
      totalSections,
    };
  }, [sections, uploadedFiles]);
  function showSuccess(message: string) {
    setError("");
    setSuccessMessage(message);
  }

  function showError(message: string) {
    setSuccessMessage("");
    setError(message);
  }

  function ensureCourseEditable() {
    if (canEditCourse) return true;

    showError(lockedMessage);
    return false;
  }

  function toggleSectionCollapse(sectionId: string) {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }

  function collapseAllSections() {
    const next: Record<string, boolean> = {};

    sections.forEach((section) => {
      next[section.id] = true;
    });

    setCollapsedSections(next);
  }

  function expandAllSections() {
    setCollapsedSections({});
  }

  async function fetchLessonFiles(sectionId: string, lessonId: string) {
    return getInstructorLessonFiles(
      courseId,
      sectionId,
      lessonId,
      { limit: 100, page: 1, sortDirection: "desc", sortField: "createdAt" },
      accessToken ?? "",
    );
  }

  async function fetchSectionsAndLessons(silent = false) {
    if (!accessToken) return;

    try {
      if (!silent) setLoading(true);

      const sectionList = await getInstructorCourseSections(
        courseId,
        { limit: 100 },
        accessToken,
      );
      const nextUploadedFiles: Record<string, LessonFileMedia[]> = {};

      const sectionsWithLessons = await Promise.all(
        sectionList.map(async (section) => {
          try {
            const lessons = await getInstructorCourseLessons(
              courseId,
              section.id,
              { limit: 100, sortDirection: "asc", sortField: "lessonIndex" },
              accessToken,
            );

            await Promise.all(
              lessons.map(async (lesson) => {
                try {
                  nextUploadedFiles[lesson.id] = await fetchLessonFiles(
                    section.id,
                    lesson.id,
                  );
                } catch {
                  nextUploadedFiles[lesson.id] = [];
                }
              }),
            );

            return { ...section, lessons };
          } catch {
            return { ...section, lessons: section.lessons ?? [] };
          }
        }),
      );

      setSections(sectionsWithLessons);
      setUploadedFiles(nextUploadedFiles);
    } catch (loadError) {
      showError(getErrorMessage(loadError, "Failed to load curriculum."));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    const token = accessToken;
    let isMounted = true;

    async function bootstrap() {
      try {
        const coursesResponse = await getInstructorCourses(
          { limit: 100 },
          token,
        );

        if (!isMounted) return;

        const found =
          (coursesResponse.data ?? []).find((item) => item.id === courseId) ??
          null;

        setCourse(found);

        if (!found) {
          showError("Course not found or no longer available.");
          return;
        }

        await fetchSectionsAndLessons();
      } catch (loadError) {
        if (isMounted) {
          showError(getErrorMessage(loadError, "Failed to load curriculum."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, courseId, status]);
  async function handleCreateSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ensureCourseEditable() || !accessToken) return;

    if (!sectionTitle.trim()) {
      showError("Section title is required.");
      return;
    }

    try {
      setCreatingSection(true);
      setError("");
      setSuccessMessage("");

      await createInstructorCourseSection(
        courseId,
        {
          description: sectionDescription.trim() || undefined,
          title: sectionTitle.trim(),
        },
        accessToken,
      );

      setSectionTitle("");
      setSectionDescription("");
      setSectionModalOpen(false);
      showSuccess("Section created successfully.");
      await fetchSectionsAndLessons(true);
    } catch (createError) {
      showError(getErrorMessage(createError, "Failed to create section."));
    } finally {
      setCreatingSection(false);
    }
  }

  function startEditSection(section: Section) {
    if (!ensureCourseEditable()) return;

    setEditingSectionId(section.id);
    setEditSectionTitle(section.title);
    setEditSectionDescription(section.description ?? "");
  }

  async function handleUpdateSection(sectionId: string) {
    if (!ensureCourseEditable() || !accessToken) return;

    try {
      setError("");
      setSuccessMessage("");

      await updateInstructorCourseSection(
        courseId,
        sectionId,
        {
          description: editSectionDescription || null,
          title: editSectionTitle,
        },
        accessToken,
      );

      setEditingSectionId(null);
      showSuccess("Section updated successfully.");
      await fetchSectionsAndLessons(true);
    } catch (updateError) {
      showError(getErrorMessage(updateError, "Failed to update section."));
    }
  }

  async function confirmDeleteSection() {
    if (!sectionToDelete || !accessToken) return;
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await deleteInstructorCourseSection(
        courseId,
        sectionToDelete.id,
        accessToken,
      );

      setSectionToDelete(null);
      showSuccess("Section deleted successfully.");
      await fetchSectionsAndLessons(true);
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, "Failed to delete section."));
    }
  }

  async function handleToggleSection(section: Section) {
    if (!ensureCourseEditable() || !accessToken) return;

    try {
      setError("");
      setSuccessMessage("");

      await updateInstructorCourseSectionStatus(
        courseId,
        section.id,
        !section.isActive,
        accessToken,
      );

      showSuccess(
        section.isActive
          ? "Section disabled successfully."
          : "Section enabled successfully.",
      );
      await fetchSectionsAndLessons(true);
    } catch (toggleError) {
      showError(getErrorMessage(toggleError, "Failed to update section."));
    }
  }

  async function moveSection(sectionId: string, direction: "up" | "down") {
    if (!ensureCourseEditable() || !accessToken) return;

    const currentIndex = sections.findIndex((item) => item.id === sectionId);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= sections.length
    ) {
      return;
    }

    const copied = [...sections];
    const [moved] = copied.splice(currentIndex, 1);

    copied.splice(targetIndex, 0, moved);
    setSections(copied);

    try {
      await reorderInstructorCourseSections(
        courseId,
        copied.map((section) => section.id),
        accessToken,
      );

      showSuccess("Sections reordered successfully.");
      await fetchSectionsAndLessons(true);
    } catch (reorderError) {
      showError(getErrorMessage(reorderError, "Failed to reorder sections."));
      await fetchSectionsAndLessons(true);
    }
  }
  function updateLessonDraftForm(patch: Partial<LessonDraftForm>) {
    setLessonDraftForm((prev) => ({ ...prev, ...patch }));
  }

  function clearLessonDraftForm() {
    if (lessonDraftForm.filePreviewUrl) {
      URL.revokeObjectURL(lessonDraftForm.filePreviewUrl);
    }

    setLessonDraftForm(getDefaultLessonDraftForm());
  }

  function openLessonForm(sectionId: string) {
    if (!ensureCourseEditable()) return;

    clearLessonDraftForm();
    setLessonFormSectionId(sectionId);
  }

  function closeLessonForm() {
    clearLessonDraftForm();
    setLessonFormSectionId(null);
  }

  async function saveLessonFileFromFile(
    sectionId: string,
    lesson: Lesson,
    file: File,
    mediaType: LessonMediaType,
  ) {
    if (!accessToken) {
      throw new Error("Your session is not ready. Please sign in again.");
    }

    setUploading({
      lessonId: lesson.id,
      progressText: "Getting upload signature...",
    });

    const resourceType = getCloudinaryResourceType(mediaType);
    const signature = await getUploadSignature(
      {
        entityId: lesson.id,
        entityType: "lesson",
        resourceType,
        subFolder: "files",
      },
      accessToken,
    );

    setUploading({
      lessonId: lesson.id,
      progressText: "Uploading to Cloudinary...",
    });

    const cloudinaryResult = await uploadFileToCloudinary(file, signature);

    setUploading({
      lessonId: lesson.id,
      progressText: "Saving media information...",
    });

    return createInstructorLessonFile(
      courseId,
      sectionId,
      lesson.id,
      {
        cloudinaryPublicId: cloudinaryResult.public_id ?? null,
        filename: file.name,
        mimeType: file.type || null,
        sizeInBytes: file.size,
        type: mediaType,
        url: cloudinaryResult.secure_url,
      },
      accessToken,
    );
  }

  async function saveLessonFileFromUrl(
    sectionId: string,
    lesson: Lesson,
    url: string,
    filename?: string,
  ) {
    if (!accessToken) {
      throw new Error("Your session is not ready. Please sign in again.");
    }

    const type = inferMediaTypeFromUrl(url);
    const finalFilename = filename?.trim() || getFilenameFromUrl(url);

    return createInstructorLessonFile(
      courseId,
      sectionId,
      lesson.id,
      {
        cloudinaryPublicId: null,
        filename: finalFilename,
        mimeType: null,
        sizeInBytes: null,
        type,
        url,
      },
      accessToken,
    );
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lessonFormSectionId || !accessToken) return;
    if (!ensureCourseEditable()) return;

    const title = lessonDraftForm.title.trim();
    const description = lessonDraftForm.description.trim();
    const mediaUrl = lessonDraftForm.mediaUrl.trim();
    const mediaFilename = lessonDraftForm.mediaFilename.trim();

    if (!title) {
      showError("Lesson title is required.");
      return;
    }

    if (mediaUrl && !isValidUrl(mediaUrl)) {
      showError("Media URL is invalid.");
      return;
    }

    try {
      setCreatingLessonSectionId(lessonFormSectionId);
      setError("");
      setSuccessMessage("");

      const createdLesson = await createInstructorCourseLesson(
        courseId,
        lessonFormSectionId,
        { description: description || null, title },
        accessToken,
      );

      const savedMedia: LessonFileMedia[] = [];

      if (lessonDraftForm.file && lessonDraftForm.fileMediaType) {
        const fileMedia = await saveLessonFileFromFile(
          lessonFormSectionId,
          createdLesson,
          lessonDraftForm.file,
          lessonDraftForm.fileMediaType,
        );

        savedMedia.push(fileMedia);
      }

      if (mediaUrl) {
        const linkMedia = await saveLessonFileFromUrl(
          lessonFormSectionId,
          createdLesson,
          mediaUrl,
          mediaFilename,
        );

        savedMedia.push(linkMedia);
      }

      if (savedMedia.length) {
        setUploadedFiles((prev) => ({
          ...prev,
          [createdLesson.id]: savedMedia,
        }));
      }

      closeLessonForm();
      showSuccess(
        savedMedia.length
          ? "Lesson created and media attached successfully."
          : "Lesson created successfully.",
      );
      await fetchSectionsAndLessons(true);
    } catch (createError) {
      showError(getErrorMessage(createError, "Failed to create lesson."));
    } finally {
      setCreatingLessonSectionId(null);
      setUploading(null);
    }
  }

  function handleSelectNewLessonFile(file: File) {
    if (!ensureCourseEditable()) return;

    const mediaType = getMediaTypeFromFile(file);
    const previewUrl =
      mediaType === "IMAGE" || mediaType === "VIDEO"
        ? URL.createObjectURL(file)
        : null;

    if (lessonDraftForm.filePreviewUrl) {
      URL.revokeObjectURL(lessonDraftForm.filePreviewUrl);
    }

    updateLessonDraftForm({
      file,
      fileMediaType: mediaType,
      filePreviewUrl: previewUrl,
    });
  }
  function startEditLesson(lesson: Lesson) {
    if (!ensureCourseEditable()) return;

    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description ?? "");
  }

  async function handleUpdateLesson(sectionId: string, lessonId: string) {
    if (!ensureCourseEditable() || !accessToken) return;

    try {
      setError("");
      setSuccessMessage("");

      await updateInstructorCourseLesson(
        courseId,
        sectionId,
        lessonId,
        { description: editLessonDescription || null, title: editLessonTitle },
        accessToken,
      );

      setEditingLessonId(null);
      showSuccess("Lesson updated successfully.");
      await fetchSectionsAndLessons(true);
    } catch (updateError) {
      showError(getErrorMessage(updateError, "Failed to update lesson."));
    }
  }

  async function confirmDeleteLesson() {
    if (!lessonToDelete || !accessToken) return;
    if (!ensureCourseEditable()) return;

    try {
      setError("");
      setSuccessMessage("");

      await deleteInstructorCourseLesson(
        courseId,
        lessonToDelete.sectionId,
        lessonToDelete.lesson.id,
        accessToken,
      );

      setLessonToDelete(null);
      showSuccess("Lesson deleted successfully.");
      await fetchSectionsAndLessons(true);
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, "Failed to delete lesson."));
    }
  }

  async function handleToggleLesson(sectionId: string, lesson: Lesson) {
    if (!ensureCourseEditable() || !accessToken) return;

    try {
      setError("");
      setSuccessMessage("");

      await updateInstructorCourseLesson(
        courseId,
        sectionId,
        lesson.id,
        { isActive: !lesson.isActive },
        accessToken,
      );

      showSuccess(
        lesson.isActive
          ? "Lesson disabled successfully."
          : "Lesson enabled successfully.",
      );
      await fetchSectionsAndLessons(true);
    } catch (toggleError) {
      showError(getErrorMessage(toggleError, "Failed to update lesson."));
    }
  }

  async function moveLesson(
    sectionId: string,
    lessonId: string,
    direction: "up" | "down",
  ) {
    if (!ensureCourseEditable() || !accessToken) return;

    const section = sections.find((item) => item.id === sectionId);
    if (!section?.lessons) return;

    const currentIndex = section.lessons.findIndex(
      (lesson) => lesson.id === lessonId,
    );
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= section.lessons.length
    ) {
      return;
    }

    const copied = [...section.lessons];
    const [moved] = copied.splice(currentIndex, 1);

    copied.splice(targetIndex, 0, moved);

    try {
      await reorderInstructorCourseLessons(
        courseId,
        sectionId,
        copied.map((lesson) => lesson.id),
        accessToken,
      );

      showSuccess("Lessons reordered successfully.");
      await fetchSectionsAndLessons(true);
    } catch (reorderError) {
      showError(getErrorMessage(reorderError, "Failed to reorder lessons."));
      await fetchSectionsAndLessons(true);
    }
  }

  async function handleAttachLessonMediaUrl(sectionId: string, lesson: Lesson) {
    if (!ensureCourseEditable()) return;

    const form = mediaLinkForms[lesson.id] ?? getDefaultMediaLinkForm();
    const url = form.url.trim();

    if (!url) {
      showError("Media URL is required.");
      return;
    }

    if (!isValidUrl(url)) {
      showError("Media URL is invalid.");
      return;
    }

    try {
      setSavingMediaLinkLessonId(lesson.id);
      setError("");
      setSuccessMessage("");

      const savedMedia = await saveLessonFileFromUrl(
        sectionId,
        lesson,
        url,
        form.filename,
      );

      setUploadedFiles((prev) => ({
        ...prev,
        [lesson.id]: [savedMedia, ...(prev[lesson.id] ?? [])],
      }));

      setMediaLinkForms((prev) => ({
        ...prev,
        [lesson.id]: getDefaultMediaLinkForm(),
      }));

      showSuccess("Lesson media link added successfully.");
    } catch (attachError) {
      showError(
        getErrorMessage(attachError, "Failed to add lesson media link."),
      );
    } finally {
      setSavingMediaLinkLessonId(null);
    }
  }

  function updateMediaLinkForm(
    lessonId: string,
    patch: Partial<MediaLinkForm>,
  ) {
    setMediaLinkForms((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] ?? getDefaultMediaLinkForm()),
        ...patch,
      },
    }));
  }
  function handleSelectLessonFile(
    sectionId: string,
    lesson: Lesson,
    file: File,
  ) {
    if (!ensureCourseEditable()) return;

    const mediaType = getMediaTypeFromFile(file);
    const previewUrl =
      mediaType === "IMAGE" || mediaType === "VIDEO"
        ? URL.createObjectURL(file)
        : null;

    if (pendingUpload?.previewUrl) {
      URL.revokeObjectURL(pendingUpload.previewUrl);
    }

    setPendingUpload({ file, lesson, mediaType, previewUrl, sectionId });
    setError("");
    setSuccessMessage("");
  }

  function cancelPendingUpload() {
    if (pendingUpload?.previewUrl) {
      URL.revokeObjectURL(pendingUpload.previewUrl);
    }

    setPendingUpload(null);
  }

  async function handleConfirmUploadLessonFile() {
    if (!pendingUpload) return;
    if (!ensureCourseEditable()) return;

    const { file, lesson, mediaType, sectionId } = pendingUpload;

    try {
      setError("");
      setSuccessMessage("");

      const savedMedia = await saveLessonFileFromFile(
        sectionId,
        lesson,
        file,
        mediaType,
      );

      setUploadedFiles((prev) => ({
        ...prev,
        [lesson.id]: [savedMedia, ...(prev[lesson.id] ?? [])],
      }));

      if (pendingUpload.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl);
      }

      setPendingUpload(null);
      showSuccess("Lesson media uploaded successfully.");
    } catch (uploadError) {
      showError(getErrorMessage(uploadError, "Failed to upload lesson media."));
    } finally {
      setUploading(null);
    }
  }

  function startEditFile(
    sectionId: string,
    lessonId: string,
    file: LessonFileMedia,
  ) {
    if (!ensureCourseEditable()) return;

    setEditingFile({
      file,
      form: {
        cloudinaryPublicId: file.cloudinaryPublicId || "",
        filename: file.filename || "",
        mimeType: file.mimeType || "",
        sizeInBytes:
          file.sizeInBytes === undefined || file.sizeInBytes === null
            ? ""
            : String(file.sizeInBytes),
        type: file.type,
        url: file.url || "",
      },
      lessonId,
      sectionId,
    });
  }

  function updateEditingFileForm(
    patch: Partial<NonNullable<FileEditState>["form"]>,
  ) {
    setEditingFile((prev) =>
      prev ? { ...prev, form: { ...prev.form, ...patch } } : prev,
    );
  }

  async function handleUpdateFileMedia() {
    if (!editingFile || !accessToken) return;
    if (!ensureCourseEditable()) return;

    if (!editingFile.form.url.trim()) {
      showError("File URL is required.");
      return;
    }

    if (!isValidUrl(editingFile.form.url.trim())) {
      showError("File URL is invalid.");
      return;
    }

    try {
      setSavingFileEdit(true);
      setError("");
      setSuccessMessage("");

      const updatedFile = await updateInstructorLessonFile(
        courseId,
        editingFile.sectionId,
        editingFile.lessonId,
        editingFile.file.id,
        {
          cloudinaryPublicId:
            editingFile.form.cloudinaryPublicId.trim() || null,
          filename: editingFile.form.filename.trim() || null,
          mimeType: editingFile.form.mimeType.trim() || null,
          sizeInBytes:
            editingFile.form.sizeInBytes.trim() === ""
              ? null
              : Number(editingFile.form.sizeInBytes),
          type: editingFile.form.type as MediaType,
          url: editingFile.form.url.trim(),
        },
        accessToken,
      );

      setUploadedFiles((prev) => ({
        ...prev,
        [editingFile.lessonId]: (prev[editingFile.lessonId] ?? []).map(
          (file) => (file.id === updatedFile.id ? updatedFile : file),
        ),
      }));

      setEditingFile(null);
      showSuccess("Lesson media updated successfully.");
    } catch (updateError) {
      showError(getErrorMessage(updateError, "Failed to update lesson media."));
    } finally {
      setSavingFileEdit(false);
    }
  }

  async function confirmDeleteFileMedia() {
    if (!fileToDelete || !accessToken) return;
    if (!ensureCourseEditable()) return;

    try {
      setDeletingFile(true);
      setError("");
      setSuccessMessage("");

      await deleteInstructorLessonFile(
        courseId,
        fileToDelete.sectionId,
        fileToDelete.lessonId,
        fileToDelete.file.id,
        accessToken,
      );

      setUploadedFiles((prev) => ({
        ...prev,
        [fileToDelete.lessonId]: (prev[fileToDelete.lessonId] ?? []).filter(
          (file) => file.id !== fileToDelete.file.id,
        ),
      }));

      setFileToDelete(null);
      showSuccess("Lesson media deleted successfully.");
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, "Failed to delete lesson media."));
    } finally {
      setDeletingFile(false);
    }
  }
  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="h-24 w-full rounded-lg border border-border bg-card" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-40 w-full rounded-lg border border-border bg-card"
            key={index}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Curriculum builder</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {course
                ? `Building "${course.title}". Add sections, lessons and media.`
                : "Course not found or no longer available."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              onClick={collapseAllSections}
              type="button"
            >
              Collapse all
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-pearl px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              onClick={expandAllSections}
              type="button"
            >
              Expand all
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canEditCourse}
              onClick={() => setSectionModalOpen(true)}
              type="button"
            >
              Add Section
            </button>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
          <SummaryItem
            label="Sections"
            value={curriculumSummary.totalSections}
          />
          <SummaryItem
            label="Active sections"
            value={curriculumSummary.activeSections}
          />
          <SummaryItem label="Lessons" value={curriculumSummary.totalLessons} />
          <SummaryItem
            label="Media files"
            value={curriculumSummary.totalMedia}
          />
        </dl>

        {!canEditCourse ? (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
            {lockedMessage}
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className="mt-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm leading-6 text-success"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
          <p className="text-lg font-semibold">No sections yet</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Create your first section to start structuring this course.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {sections.map((section, sectionIndex) => (
            <section
              className="rounded-lg border border-border bg-card shadow-sm"
              key={section.id}
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <button
                  aria-label={
                    collapsedSections[section.id]
                      ? "Expand section"
                      : "Collapse section"
                  }
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-3 text-sm font-semibold"
                  onClick={() => toggleSectionCollapse(section.id)}
                  type="button"
                >
                  {collapsedSections[section.id] ? "Show" : "Hide"}
                </button>

                <div className="min-w-0 flex-1">
                  {editingSectionId === section.id ? (
                    <div className="grid gap-3">
                      <input
                        className={fieldClasses}
                        onChange={(event) =>
                          setEditSectionTitle(event.target.value)
                        }
                        placeholder="Section title"
                        value={editSectionTitle}
                      />
                      <textarea
                        className={fieldClasses}
                        onChange={(event) =>
                          setEditSectionDescription(event.target.value)
                        }
                        placeholder="Section description (optional)"
                        rows={2}
                        value={editSectionDescription}
                      />
                      <div className="flex gap-2">
                        <button
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground"
                          onClick={() => handleUpdateSection(section.id)}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold"
                          onClick={() => setEditingSectionId(null)}
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
                        <Badge
                          variant={section.isActive ? "action" : "neutral"}
                        >
                          {section.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <Badge>
                          {section.lessons?.length ?? 0} lesson
                          {(section.lessons?.length ?? 0) === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>

                {editingSectionId !== section.id ? (
                  <div className="flex flex-wrap gap-2">
                    <MiniButton
                      disabled={!canEditCourse || sectionIndex === 0}
                      label="Up"
                      onClick={() => moveSection(section.id, "up")}
                    />
                    <MiniButton
                      disabled={
                        !canEditCourse || sectionIndex === sections.length - 1
                      }
                      label="Down"
                      onClick={() => moveSection(section.id, "down")}
                    />
                    <MiniButton
                      disabled={!canEditCourse}
                      label="Rename"
                      onClick={() => startEditSection(section)}
                    />
                    <MiniButton
                      disabled={!canEditCourse}
                      label={section.isActive ? "Disable" : "Enable"}
                      onClick={() => handleToggleSection(section)}
                    />
                    <MiniButton
                      danger
                      disabled={!canEditCourse}
                      label="Delete"
                      onClick={() => setSectionToDelete(section)}
                    />
                  </div>
                ) : null}
              </div>
              {!collapsedSections[section.id] ? (
                <div className="p-4">
                  {(section.lessons ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No lessons in this section yet.
                    </p>
                  ) : (
                    <ol className="grid gap-3">
                      {(section.lessons ?? []).map((lesson, lessonIndex) => (
                        <li
                          className="rounded-md border border-border bg-surface-pearl p-4"
                          key={lesson.id}
                        >
                          {editingLessonId === lesson.id ? (
                            <div className="grid gap-3">
                              <input
                                className={fieldClasses}
                                onChange={(event) =>
                                  setEditLessonTitle(event.target.value)
                                }
                                placeholder="Lesson title"
                                value={editLessonTitle}
                              />
                              <textarea
                                className={fieldClasses}
                                onChange={(event) =>
                                  setEditLessonDescription(event.target.value)
                                }
                                placeholder="Lesson description (optional)"
                                rows={2}
                                value={editLessonDescription}
                              />
                              <div className="flex gap-2">
                                <MiniButton
                                  label="Save"
                                  onClick={() =>
                                    handleUpdateLesson(section.id, lesson.id)
                                  }
                                  primary
                                />
                                <MiniButton
                                  label="Cancel"
                                  onClick={() => setEditingLessonId(null)}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium uppercase text-ink-muted">
                                    Lesson {sectionIndex + 1}.{lessonIndex + 1}
                                  </p>
                                  <p className="mt-1 line-clamp-1 font-semibold">
                                    {lesson.title}
                                  </p>
                                  {lesson.description ? (
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                      {lesson.description}
                                    </p>
                                  ) : null}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge
                                      variant={
                                        lesson.isActive ? "action" : "neutral"
                                      }
                                    >
                                      {lesson.isActive ? "Active" : "Disabled"}
                                    </Badge>
                                    <Badge>
                                      {(uploadedFiles[lesson.id] ?? []).length}{" "}
                                      media
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <MiniButton
                                    disabled={
                                      !canEditCourse || lessonIndex === 0
                                    }
                                    label="Up"
                                    onClick={() =>
                                      moveLesson(section.id, lesson.id, "up")
                                    }
                                  />
                                  <MiniButton
                                    disabled={
                                      !canEditCourse ||
                                      lessonIndex ===
                                        (section.lessons?.length ?? 0) - 1
                                    }
                                    label="Down"
                                    onClick={() =>
                                      moveLesson(section.id, lesson.id, "down")
                                    }
                                  />
                                  <MiniButton
                                    disabled={!canEditCourse}
                                    label="Edit"
                                    onClick={() => startEditLesson(lesson)}
                                  />
                                  <MiniButton
                                    disabled={!canEditCourse}
                                    label={
                                      lesson.isActive ? "Disable" : "Enable"
                                    }
                                    onClick={() =>
                                      handleToggleLesson(section.id, lesson)
                                    }
                                  />
                                  <MiniButton
                                    danger
                                    disabled={!canEditCourse}
                                    label="Delete"
                                    onClick={() =>
                                      setLessonToDelete({
                                        lesson,
                                        sectionId: section.id,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="mt-4 border-t border-border pt-3">
                                {(uploadedFiles[lesson.id] ?? []).length ===
                                0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    No media attached to this lesson.
                                  </p>
                                ) : (
                                  <ul className="grid gap-2">
                                    {(uploadedFiles[lesson.id] ?? []).map(
                                      (file) => (
                                        <li
                                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                                          key={file.id}
                                        >
                                          <div className="min-w-0 flex-1">
                                            <p className="line-clamp-1 font-medium">
                                              {file.filename || "Untitled file"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {mediaTypeLabels[file.type] ??
                                                file.type}{" "}
                                              ·{" "}
                                              {formatFileSize(file.sizeInBytes)}
                                            </p>
                                          </div>
                                          <div className="flex gap-2">
                                            <MiniButton
                                              disabled={!canEditCourse}
                                              label="Edit"
                                              onClick={() =>
                                                startEditFile(
                                                  section.id,
                                                  lesson.id,
                                                  file,
                                                )
                                              }
                                            />
                                            <MiniButton
                                              danger
                                              disabled={!canEditCourse}
                                              label="Remove"
                                              onClick={() =>
                                                setFileToDelete({
                                                  file,
                                                  lessonId: lesson.id,
                                                  sectionId: section.id,
                                                })
                                              }
                                            />
                                          </div>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                )}
                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                  <label
                                    className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                                    htmlFor={`upload-${lesson.id}`}
                                  >
                                    Upload file
                                  </label>
                                  <input
                                    accept="*/*"
                                    className="hidden"
                                    disabled={!canEditCourse}
                                    id={`upload-${lesson.id}`}
                                    onChange={(
                                      event: ChangeEvent<HTMLInputElement>,
                                    ) => {
                                      const file = event.target.files?.[0];

                                      if (file) {
                                        handleSelectLessonFile(
                                          section.id,
                                          lesson,
                                          file,
                                        );
                                      }

                                      event.target.value = "";
                                    }}
                                    type="file"
                                  />

                                  <input
                                    className="min-h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                                    onChange={(event) =>
                                      updateMediaLinkForm(lesson.id, {
                                        url: event.target.value,
                                      })
                                    }
                                    placeholder="https://example.com/video.mp4"
                                    value={mediaLinkForms[lesson.id]?.url ?? ""}
                                  />
                                  <input
                                    className="min-h-9 w-40 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                                    onChange={(event) =>
                                      updateMediaLinkForm(lesson.id, {
                                        filename: event.target.value,
                                      })
                                    }
                                    placeholder="Filename (optional)"
                                    value={
                                      mediaLinkForms[lesson.id]?.filename ?? ""
                                    }
                                  />
                                  <MiniButton
                                    disabled={
                                      !canEditCourse ||
                                      savingMediaLinkLessonId === lesson.id
                                    }
                                    label={
                                      savingMediaLinkLessonId === lesson.id
                                        ? "Adding..."
                                        : "Add link"
                                    }
                                    onClick={() =>
                                      handleAttachLessonMediaUrl(
                                        section.id,
                                        lesson,
                                      )
                                    }
                                    primary
                                  />
                                </div>
                                {uploading?.lessonId === lesson.id ? (
                                  <p className="mt-2 text-xs text-primary">
                                    {uploading.progressText}
                                  </p>
                                ) : null}
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  {lessonFormSectionId === section.id ? (
                    <form
                      className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4"
                      onSubmit={handleCreateLesson}
                    >
                      <p className="text-sm font-semibold">New lesson</p>
                      <div className="mt-3 grid gap-3">
                        <input
                          className={fieldClasses}
                          onChange={(event) =>
                            updateLessonDraftForm({ title: event.target.value })
                          }
                          placeholder="Lesson title"
                          required
                          value={lessonDraftForm.title}
                        />
                        <textarea
                          className={fieldClasses}
                          onChange={(event) =>
                            updateLessonDraftForm({
                              description: event.target.value,
                            })
                          }
                          placeholder="Lesson description (optional)"
                          rows={2}
                          value={lessonDraftForm.description}
                        />
                        <input
                          className={fieldClasses}
                          onChange={(event) =>
                            updateLessonDraftForm({
                              mediaUrl: event.target.value,
                            })
                          }
                          placeholder="Media URL (optional): https://..."
                          value={lessonDraftForm.mediaUrl}
                        />
                        <input
                          className={fieldClasses}
                          onChange={(event) =>
                            updateLessonDraftForm({
                              mediaFilename: event.target.value,
                            })
                          }
                          placeholder="Media filename (optional)"
                          value={lessonDraftForm.mediaFilename}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <label
                            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold"
                            htmlFor={`lesson-file-${section.id}`}
                          >
                            {lessonDraftForm.file
                              ? lessonDraftForm.file.name
                              : "Attach a file"}
                          </label>
                          <input
                            accept="*/*"
                            className="hidden"
                            id={`lesson-file-${section.id}`}
                            onChange={(
                              event: ChangeEvent<HTMLInputElement>,
                            ) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                handleSelectNewLessonFile(file);
                              }

                              event.target.value = "";
                            }}
                            type="file"
                          />
                          {lessonDraftForm.filePreviewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="h-14 w-24 rounded-md border border-border object-cover"
                              src={lessonDraftForm.filePreviewUrl}
                            />
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={creatingLessonSectionId === section.id}
                            type="submit"
                          >
                            {creatingLessonSectionId === section.id
                              ? "Creating..."
                              : "Create Lesson"}
                          </button>
                          <button
                            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                            onClick={closeLessonForm}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4">
                      <button
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-dashed border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canEditCourse}
                        onClick={() => openLessonForm(section.id)}
                        type="button"
                      >
                        Add Lesson
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
      <InstructorModal
        onClose={() => setSectionModalOpen(false)}
        open={sectionModalOpen}
        title="Add section"
      >
        <form className="grid gap-3" onSubmit={handleCreateSection}>
          <input
            className={fieldClasses}
            onChange={(event) => setSectionTitle(event.target.value)}
            placeholder="Section title"
            required
            value={sectionTitle}
          />
          <textarea
            className={fieldClasses}
            onChange={(event) => setSectionDescription(event.target.value)}
            placeholder="Section description (optional)"
            rows={3}
            value={sectionDescription}
          />
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
              onClick={() => setSectionModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              disabled={creatingSection}
              type="submit"
            >
              {creatingSection ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </InstructorModal>

      <InstructorModal
        onClose={() => setSectionToDelete(null)}
        open={sectionToDelete !== null}
        title="Delete section"
      >
        <p>
          Delete section{" "}
          <span className="font-semibold text-foreground">
            {sectionToDelete?.title}
          </span>{" "}
          and all of its lessons? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setSectionToDelete(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground"
            onClick={confirmDeleteSection}
            type="button"
          >
            Delete
          </button>
        </div>
      </InstructorModal>

      <InstructorModal
        onClose={() => setLessonToDelete(null)}
        open={lessonToDelete !== null}
        title="Delete lesson"
      >
        <p>
          Delete lesson{" "}
          <span className="font-semibold text-foreground">
            {lessonToDelete?.lesson.title}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setLessonToDelete(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground"
            onClick={confirmDeleteLesson}
            type="button"
          >
            Delete
          </button>
        </div>
      </InstructorModal>
      <InstructorModal
        onClose={cancelPendingUpload}
        open={pendingUpload !== null}
        title="Upload lesson file"
      >
        {pendingUpload ? (
          <div className="grid gap-3">
            <p>
              Upload{" "}
              <span className="font-semibold text-foreground">
                {pendingUpload.file.name}
              </span>{" "}
              ({mediaTypeLabels[pendingUpload.mediaType]}) to{" "}
              {pendingUpload.lesson.title}?
            </p>
            {pendingUpload.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="aspect-video w-full rounded-md border border-border object-cover"
                src={pendingUpload.previewUrl}
              />
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                disabled={uploading !== null}
                onClick={cancelPendingUpload}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                disabled={uploading !== null}
                onClick={handleConfirmUploadLessonFile}
                type="button"
              >
                {uploading ? uploading.progressText : "Upload"}
              </button>
            </div>
          </div>
        ) : null}
      </InstructorModal>
      <InstructorModal
        onClose={() => setEditingFile(null)}
        open={editingFile !== null}
        title="Edit lesson media"
      >
        {editingFile ? (
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="file-url">
                URL
              </label>
              <input
                className={fieldClasses}
                id="file-url"
                onChange={(event) =>
                  updateEditingFileForm({ url: event.target.value })
                }
                value={editingFile.form.url}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="file-filename">
                Filename
              </label>
              <input
                className={fieldClasses}
                id="file-filename"
                onChange={(event) =>
                  updateEditingFileForm({ filename: event.target.value })
                }
                value={editingFile.form.filename}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="file-type">
                Media type
              </label>
              <select
                className={fieldClasses}
                id="file-type"
                onChange={(event) =>
                  updateEditingFileForm({
                    type: event.target.value as MediaType,
                  })
                }
                value={editingFile.form.type}
              >
                {(
                  [
                    "IMAGE",
                    "VIDEO",
                    "AUDIO",
                    "DOCUMENT",
                    "OTHER",
                  ] as MediaType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {mediaTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
                disabled={savingFileEdit}
                onClick={() => setEditingFile(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingFileEdit}
                onClick={handleUpdateFileMedia}
                type="button"
              >
                {savingFileEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : null}
      </InstructorModal>
      <InstructorModal
        onClose={() => setFileToDelete(null)}
        open={fileToDelete !== null}
        title="Remove lesson media"
      >
        <p>
          Remove{" "}
          <span className="font-semibold text-foreground">
            {fileToDelete?.file.filename || "this file"}
          </span>{" "}
          from the lesson?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            disabled={deletingFile}
            onClick={() => setFileToDelete(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deletingFile}
            onClick={confirmDeleteFileMedia}
            type="button"
          >
            {deletingFile ? "Removing..." : "Remove"}
          </button>
        </div>
      </InstructorModal>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface-pearl px-4 py-3">
      <dt className="font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-1 text-muted-foreground">{value}</dd>
    </div>
  );
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
