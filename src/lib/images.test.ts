import { describe, expect, it } from "vitest";
import { IMAGE_LIMIT, prepareImage, validateImage, type ImageProcessor } from "./images";
import { vi } from "vitest";

describe("wardrobe photo validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s and preserves original when processing is unavailable", async (type) => {
    const file = new File(["image"], "photo", { type });
    expect(await prepareImage(file)).toMatchObject({ full: file, thumb: file, mimeType: type });
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

describe("image optimisation", () => {
  function processor(width = 3000, height = 1500) {
    return {
      decode: vi.fn(async () => ({ width, height, source: {} as CanvasImageSource, close: vi.fn() })),
      encode: vi.fn(async (_source, w) => new Blob([new Uint8Array(w)], { type: "image/webp" })),
    } satisfies ImageProcessor;
  }
  const file = new File(["original EXIF GPS data"], "photo.jpg", { type: "image/jpeg" });
  it("re-encodes both sizes, reduces thumbnail dimensions and preserves landscape aspect ratio", async () => {
    const p = processor();
    const result = await prepareImage(file, p);
    expect(p.encode.mock.calls.map((call) => call.slice(1))).toEqual([[2000, 1000, 0.82], [400, 200, 0.65]]);
    expect(result.full.type).toBe("image/webp");
    expect(result.thumb.size).toBeLessThan(result.full.size);
    expect(await result.full.text()).not.toContain("GPS");
    expect((await p.decode.mock.results[0]!.value).close).toHaveBeenCalledOnce();
  });
  it("preserves portrait aspect ratio without upscaling", async () => {
    const p = processor(100, 200);
    await prepareImage(file, p);
    expect(p.encode.mock.calls.map((call) => call.slice(1, 3))).toEqual([[100, 200], [100, 200]]);
  });
  it("shares full output when a thumbnail encoding is not smaller", async () => {
    const p = processor();
    p.encode.mockImplementation(async () => new Blob(["same"], { type: "image/webp" }));
    const result = await prepareImage(file, p);
    expect(result.thumb).toBe(result.full);
  });
  it("preserves the original on encoding failure and releases decoded resources", async () => {
    const p = processor();
    p.encode.mockRejectedValue(new Error("unsupported"));
    const result = await prepareImage(file, p);
    expect(result).toEqual({ full: file, thumb: file, mimeType: file.type });
    expect((await p.decode.mock.results[0]!.value).close).toHaveBeenCalledOnce();
  });
  it("keeps the original when only thumbnail encoding fails", async () => {
    const p = processor();
    p.encode.mockResolvedValueOnce(new Blob(["webp"], { type: "image/webp" })).mockRejectedValueOnce(new Error("failed"));
    expect((await prepareImage(file, p)).full).toBe(file);
  });
});
