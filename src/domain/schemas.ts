/**
 * Validation at trust boundaries: forms, repository writes and rows read back from the database.
 * Built from the taxonomy so new categories/colours need no schema edits.
 */
import { z } from "zod";
import {
  OCCASIONS,
  PATTERNS,
  SEASONS,
  SLOTS,
  STYLES,
  isCategorySlug,
  isColorSlug,
  isSubcategorySlug,
  subcategoryBelongsTo,
  type OccasionSlug,
  type PatternSlug,
  type SeasonSlug,
  type Slot,
  type StyleSlug,
} from "./taxonomy";

const slugs = <T extends string>(list: readonly { slug: T }[]) => list.map((x) => x.slug) as [T, ...T[]];

export const patternSchema = z.enum(slugs<PatternSlug>(PATTERNS));
export const occasionSchema = z.enum(slugs<OccasionSlug>(OCCASIONS));
export const seasonSchema = z.enum(slugs<SeasonSlug>(SEASONS));
export const styleSchema = z.enum(slugs<StyleSlug>(STYLES));
export const slotSchema = z.enum(SLOTS as unknown as [Slot, ...Slot[]]);

const colorSlug = z.string().refine(isColorSlug, { message: "Choose a colour from the list." });

export const ITEM_NAME_MAX = 80;
export const OUTFIT_NAME_MAX = 60;
export const OUTFIT_NOTES_MAX = 500;

/** What a user submits when adding or editing an item. Only name + category are required (MVP_REQUIREMENTS §2). */
export const itemInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Give this piece a name." })
      .max(ITEM_NAME_MAX, { message: `Keep the name under ${ITEM_NAME_MAX} characters.` }),
    categorySlug: z.string().refine(isCategorySlug, { message: "Choose a category." }),
    subcategorySlug: z
      .string()
      .refine(isSubcategorySlug, { message: "Choose a type from the list." })
      .nullable()
      .default(null),
    primaryColor: colorSlug.nullable().default(null),
    secondaryColor: colorSlug.nullable().default(null),
    pattern: patternSchema.nullable().default(null),
    styleTags: z.array(styleSchema).max(5).default([]),
    occasionTags: z.array(occasionSchema).max(6).default([]),
    seasonTags: z.array(seasonSchema).max(4).default([]),
  })
  .refine((v) => v.subcategorySlug === null || subcategoryBelongsTo(v.subcategorySlug, v.categorySlug), {
    message: "That type doesn't belong to the chosen category.",
    path: ["subcategorySlug"],
  });

export type ItemInput = z.infer<typeof itemInputSchema>;
/** Raw form values before parsing (defaults not yet applied). */
export type ItemFormValues = z.input<typeof itemInputSchema>;

export const outfitPieceSchema = z.object({
  slot: slotSchema,
  itemId: z.string().min(1).nullable(),
  position: z.number().int().min(0),
});

export const outfitInputSchema = z.object({
  name: z
    .string()
    .trim()
    .max(OUTFIT_NAME_MAX, { message: `Keep the name under ${OUTFIT_NAME_MAX} characters.` })
    .nullable()
    .default(null)
    .transform((v) => (v === "" ? null : v)),
  notes: z
    .string()
    .trim()
    .max(OUTFIT_NOTES_MAX, { message: `Keep notes under ${OUTFIT_NOTES_MAX} characters.` })
    .nullable()
    .default(null)
    .transform((v) => (v === "" ? null : v)),
  source: z.enum(["manual", "suggestion"]).default("manual"),
  pieces: z.array(outfitPieceSchema).min(1, { message: "Add at least one piece." }),
});

export type OutfitInput = z.infer<typeof outfitInputSchema>;
export type OutfitInputValues = z.input<typeof outfitInputSchema>;

/** Turns a Zod error into { fieldName: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
