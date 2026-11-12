export const WARDROBE_BUCKET = "wardrobe-images";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Store object keys, never public/signed URLs, in ClothingItem.image. */
export function wardrobeImagePaths(userId: string, itemId: string) {
  if (!uuid.test(userId) || !uuid.test(itemId)) throw new Error("Image paths require valid user and item UUIDs.");
  const prefix = `${userId.toLowerCase()}/${itemId.toLowerCase()}`;
  return { path: `${prefix}/full.webp`, thumbPath: `${prefix}/thumb.webp` };
}
