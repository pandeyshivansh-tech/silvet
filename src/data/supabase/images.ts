import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageRef, PreparedImage } from "@/domain/types";
import type { Database } from "@/lib/supabase/database.types";
import { WARDROBE_BUCKET, wardrobeImagePaths } from "@/lib/supabase/storagePaths";
import { validateImage } from "@/lib/images";
import { RepositoryError } from "../repository";

export const IMAGE_URL_SECONDS = 3600;

/** Bound to one account; check again before every Storage request. RLS is authoritative. */
export class WardrobeImages {
  constructor(private client: SupabaseClient<Database>, private userId: string) {}

  async assertAccount() {
    const { data, error } = await this.client.auth.getUser();
    if (error || data.user?.id !== this.userId || !data.user.email_confirmed_at)
      throw new RepositoryError("unauthenticated", "The signed-in account changed. Please sign in again.");
  }
  private checkPath(path: string) {
    if (!path.startsWith(`${this.userId}/`) || path.split("/").some((p) => !p || p === "." || p === ".."))
      throw new RepositoryError("storage", "This image does not belong to your account.");
  }
  async upload(image: PreparedImage, itemId: string): Promise<ImageRef> {
    validateImage(image.full);
    validateImage(image.thumb);
    if (image.mimeType !== image.full.type || image.thumb.type !== image.full.type)
      throw new RepositoryError("storage", "The image format does not match its contents.");
    await this.assertAccount();
    const extension = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/png" ? "png" : "webp";
    const prefix = `${wardrobeImagePaths(this.userId, itemId).path.slice(0, -"/full.webp".length)}/${crypto.randomUUID()}`;
    const path = `${prefix}/full.${extension}`;
    const thumbPath = image.thumb === image.full ? path : `${prefix}/thumb.${extension}`;
    const bucket = this.client.storage.from(WARDROBE_BUCKET);
    const first = await bucket.upload(path, image.full, { upsert: false, contentType: image.mimeType });
    if (first.error) throw new RepositoryError("storage", "Your photo could not be uploaded. Please retry.");
    try {
      if (thumbPath !== path) {
        await this.assertAccount();
        const thumb = await bucket.upload(thumbPath, image.thumb, { upsert: false, contentType: image.mimeType });
        if (thumb.error) throw new Error("Thumbnail upload failed");
      }
    } catch {
      await this.cleanup({ path, thumbPath });
      throw new RepositoryError("storage", "Your photo could not be uploaded. Please retry.");
    }
    return { path, thumbPath };
  }
  /** Cleanup is best-effort: never turn a committed database save into a failed save. */
  async cleanup(ref: ImageRef | null) {
    if (!ref) return;
    try {
      this.checkPath(ref.path);
      this.checkPath(ref.thumbPath);
      await this.assertAccount();
      await this.client.storage.from(WARDROBE_BUCKET).remove([...new Set([ref.path, ref.thumbPath])]);
    } catch { /* Offline/account changes leave an orphan, never delete across accounts. */ }
  }
  async urls(refs: readonly ImageRef[]) {
    const paths = [...new Set(refs.flatMap((ref) => [ref.path, ref.thumbPath]))];
    paths.forEach((path) => this.checkPath(path));
    await this.assertAccount();
    if (!paths.length) return {};
    const { data, error } = await this.client.storage.from(WARDROBE_BUCKET).createSignedUrls(paths, IMAGE_URL_SECONDS);
    if (error) throw new RepositoryError("storage", "Photos could not be loaded. Please retry.");
    await this.assertAccount();
    const signed = new Map(data?.map((entry) => [entry.path, entry.signedUrl]));
    return Object.fromEntries(refs.map((ref) => {
      const full = signed.get(ref.path), thumb = signed.get(ref.thumbPath);
      if (!full || !thumb) throw new RepositoryError("storage", "A photo is unavailable. Please retry.");
      return [ref.path, { full, thumb }];
    }));
  }
}
