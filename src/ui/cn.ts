/** Joins class names, skipping falsy values. Keep variants explicit instead of relying on class overriding. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
