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

export interface ImageProcessor {
  decode: (file: File) => Promise<{ width: number; height: number; source: CanvasImageSource; close: () => void }>;
  encode: (source: CanvasImageSource, width: number, height: number, quality: number) => Promise<Blob>;
}

const browserProcessor: ImageProcessor = {
  async decode(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
  },
  encode(source, width, height, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return Promise.reject(new Error("Canvas is unavailable"));
    context.drawImage(source, 0, 0, width, height);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (blob?.type === "image/webp") resolve(blob);
      else reject(new Error("WebP encoding is unavailable"));
    }, "image/webp", quality));
  },
};

/** Preserve aspect ratio: never crop. Canvas re-encoding discards source EXIF/GPS.
 * Unsupported browsers/decoding/encoding failures retain the original, including its metadata.
 */
export async function prepareImage(file: File, processor: ImageProcessor = browserProcessor): Promise<PreparedImage> {
  validateImage(file);
  let decoded: Awaited<ReturnType<ImageProcessor["decode"]>> | undefined;
  try {
    decoded = await processor.decode(file);
    if (!(decoded.width > 0 && decoded.height > 0)) throw new Error("Invalid dimensions");
    const encode = (edge: number, quality: number) => {
      const scale = Math.min(1, edge / Math.max(decoded!.width, decoded!.height));
      return processor.encode(decoded!.source, Math.max(1, Math.round(decoded!.width * scale)),
        Math.max(1, Math.round(decoded!.height * scale)), quality);
    };
    const full = await encode(2000, 0.82);
    validateImage(full);
    let thumb = await encode(400, 0.65);
    // For tiny/simple images there may be no smaller encoding. Share the full
    // image rather than upload a larger object masquerading as a thumbnail.
    if (thumb.size >= full.size) thumb = full;
    validateImage(thumb);
    return { full, thumb, mimeType: "image/webp" };
  } catch {
    return { full: file, thumb: file, mimeType: file.type };
  } finally {
    decoded?.close();
  }
}
