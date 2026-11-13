/**
 * Accessories differ more than any other slot, so their common types get their own silhouette instead of the
 * generic bag. Keys are taxonomy subcategory slugs (garmentGlyphPaths.test.ts checks each still exists).
 */
export const ACCESSORY_PATHS: Record<string, string[]> = {
  "caps-hats": ["M8 40c0-14 7-22 16-22s16 8 16 22h5c1.5 0 1.5 4 0 4H8Z", "M24 18v22", "M16 22c-2 5-3 11-3 18"],
  jewellery: ["M14 28c-4 0-7 5-7 11h14c0-6-3-11-7-11ZM34 28c-4 0-7 5-7 11h14c0-6-3-11-7-11Z", "M14 18v10M34 18v10", "M8 42h12M28 42h12"],
  "scarves-stoles": ["M15 6h18l-2 44H17Z", "M17 50l-1 5M21 50v5M25 50v5M29 50v5M32 50l1 5", "M15 16l17 6"],
  dupattas: ["M15 6h18l-2 44H17Z", "M17 50l-1 5M21 50v5M25 50v5M29 50v5M32 50l1 5", "M15 16l17 6"],
  watches: ["M19 6h10v14H19ZM19 40h10v14H19ZM24 19a11 11 0 1 0 .01 0Z", "M24 30v-6M24 30h4"],
  belts: ["M3 26h42v9H3Z", "M17 23h12v15H17Z", "M22 30.5h7"],
  sunglasses: ["M4 25h17c0 8-4 12-8.5 12S4 33 4 25ZM27 25h17c0 8-4 12-8.5 12S27 33 27 25Z", "M21 27c2-2 4-2 6 0", "M4 25l-1-4M44 25l1-4"],
};

/** One-piece silhouettes that read wrongly as the generic dress: a saree is a drape with pleats and a pallu. */
export const ONE_PIECE_PATHS: Record<string, string[]> = {
  sarees: ["M18 4h11l3 20 4 32H12l3-22-3-6Z", "M15 34 32 24", "M21 42v14M25 42v14"],
  "kurta-sets": ["M17 6 9 9 5 28l5 1 3-13v30h22V16l3 13 5-1-4-19-8-3c-2 3-12 3-14 0Z", "M24 7.5v10", "M16 40v6M32 40v6", "M17 46l-1 12h6l2-9 2 9h6l-1-12"],
};

/**
 * Indian tops and footwear have their own shape: a kurta drawn as a T-shirt (or a jutti as a sneaker) tells an
 * India-first wardrobe it is an afterthought. Kurta: long tunic, placket, side slits; kurti: the same at hip length.
 */
export const TOP_PATHS: Record<string, string[]> = {
  kurtas: ["M17 6 9 9 5 28l5 1 3-13v40h22V16l3 13 5-1-4-19-8-3c-2 3-12 3-14 0Z", "M24 7.5v10", "M16 48v8M32 48v8"],
  "short-kurtis": ["M17 10 9 13 5 32l5 1 3-13v26h22V20l3 13 5-1-4-19-8-3c-2 3-12 3-14 0Z", "M24 11.5v9", "M16 38v8M32 38v8"],
};
export const FOOTWEAR_PATHS: Record<string, string[]> = {
  kolhapuris: ["M5 46c0-2 2-3 5-3h30c3 0 5 1 5 3v2H5ZM15 43c3-6 9-8 15-7l5 7Z", "M36 43l3-4", "M19 40l9 0"],
  juttis: ["M6 46c0-5 3-9 8-9 4 3 10 3 14 1 6 0 11 2 14 5 2-1 3-3 3-5 1 3 0 7-3 9-1 1-3 1-5 1H6Z", "M16 41c4 2 9 2 13 0"],
};
