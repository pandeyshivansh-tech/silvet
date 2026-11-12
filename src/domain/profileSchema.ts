import { z } from "zod";
import { STYLES } from "./taxonomy";
export const profileInputSchema = z.object({
  displayName: z.string().trim().max(80, "Use no more than 80 characters.").nullable().transform((value) => value || null),
  stylePreferences: z.array(z.enum(STYLES.map((style) => style.slug))).max(STYLES.length).transform((values) => [...new Set(values)]),
});
