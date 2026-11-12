import type { PreparedImage } from "@/domain/types";
import { RepositoryError } from "@/data/repository";

export const IMAGE_LIMIT = 10 * 1024 * 1024;
const formats = ["image/jpeg", "image/png", "image/webp"];

export function validateImage(blob: Blob) {
  if (!formats.includes(blob.type))
    throw new RepositoryError("storage", "Choose a JPEG, PNG or WebP image.");
  if (!blob.size || blob.size > IMAGE_LIMIT)
    throw new RepositoryError("storage", "Choose a non-empty image no larger than 10 MiB.");
}

/** Retain the original quality; both display sizes share a single private object. */
export function prepareImage(file: File): PreparedImage {
  validateImage(file);
  return { full: file, thumb: file, mimeType: file.type };
}
