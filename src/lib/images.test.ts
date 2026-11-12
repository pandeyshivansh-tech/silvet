import { describe, expect, it } from "vitest";
import { IMAGE_LIMIT, prepareImage, validateImage } from "./images";

describe("wardrobe photo validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    const file = new File(["image"], "photo", { type });
    expect(prepareImage(file)).toMatchObject({ full: file, thumb: file, mimeType: type });
  });
  it.each(["image/gif", "image/heic", "image/svg+xml", "text/plain", ""])("rejects %s", (type) => {
    expect(() => validateImage(new Blob(["file"], { type }))).toThrow("JPEG, PNG or WebP");
  });
  it("rejects empty and oversized files", () => {
    expect(() => validateImage(new Blob([], { type: "image/png" }))).toThrow("10 MiB");
    expect(() => validateImage(new Blob([new Uint8Array(IMAGE_LIMIT + 1)], { type: "image/png" }))).toThrow("10 MiB");
  });
  it("accepts exactly 10 MiB", () => {
    expect(() => validateImage(new Blob([new Uint8Array(IMAGE_LIMIT)], { type: "image/jpeg" }))).not.toThrow();
  });
});
