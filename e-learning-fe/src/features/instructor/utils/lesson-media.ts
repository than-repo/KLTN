import type {
  MediaType,
  UploadSignatureResponse,
} from "../types/instructor-course";

export type LessonMediaType = MediaType;

export function getMediaTypeFromFile(file: File): LessonMediaType {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/.test(name)
  ) {
    return "IMAGE";
  }

  if (mime.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi)$/.test(name)) {
    return "VIDEO";
  }

  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(name)) {
    return "AUDIO";
  }

  if (
    mime === "application/pdf" ||
    name.endsWith(".pdf") ||
    /\.(doc|docx|ppt|pptx|xls|xlsx|odt|ods|odp|txt|csv)$/.test(name) ||
    mime.includes("officedocument") ||
    mime.includes("msword") ||
    mime.includes("ms-excel") ||
    mime.includes("ms-powerpoint")
  ) {
    return "DOCUMENT";
  }

  return "OTHER";
}

export function isYoutubeUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace("www.", "");

    return (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be" ||
      hostname === "youtube-nocookie.com"
    );
  } catch {
    return false;
  }
}

export function inferMediaTypeFromUrl(url: string): LessonMediaType {
  const lowerUrl = url.toLowerCase();

  if (isYoutubeUrl(url) || /\.(mp4|webm|mov|m3u8|mkv)(\?|$)/.test(lowerUrl)) {
    return "VIDEO";
  }

  if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(lowerUrl)) {
    return "AUDIO";
  }

  if (/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/.test(lowerUrl)) {
    return "IMAGE";
  }

  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv)(\?|$)/.test(lowerUrl)) {
    return "DOCUMENT";
  }

  return "OTHER";
}

export function getCloudinaryResourceType(
  mediaType: LessonMediaType,
): "image" | "video" | "raw" {
  if (mediaType === "IMAGE") return "image";
  if (mediaType === "VIDEO" || mediaType === "AUDIO") return "video";
  return "raw";
}

export function getFilenameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const filename = parsedUrl.pathname.split("/").filter(Boolean).pop();

    if (isYoutubeUrl(url)) {
      return filename || "YouTube video";
    }

    return filename || "External resource";
  } catch {
    return "External resource";
  }
}

export function isValidUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function uploadFileToCloudinary(
  file: File,
  signature: UploadSignatureResponse,
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);

  if (signature.uploadPreset) {
    formData.append("upload_preset", signature.uploadPreset);
  }

  if (signature.folder) {
    formData.append("folder", signature.folder);
  }

  const resourceType = signature.resourceType ?? "raw";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
    { body: formData, method: "POST" },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Cloudinary upload failed.");
  }

  return response.json() as Promise<{
    public_id?: string;
    secure_url: string;
  }>;
}

export const mediaTypeLabels: Record<LessonMediaType, string> = {
  AUDIO: "Audio",
  DOCUMENT: "Document",
  IMAGE: "Image",
  OTHER: "Other",
  VIDEO: "Video",
};
