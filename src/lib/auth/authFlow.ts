import { z } from "zod";
import { paths } from "@/app/paths";

export const signInSchema = z.object({ email: z.string().trim().pipe(z.email()), password: z.string().min(1, "Enter your password.") });
export const signUpSchema = signInSchema.extend({ password: z.string().min(8, "Use at least 8 characters.") });
export const emailCodeSchema = z.string().trim().regex(/^\d{6,10}$/, "Enter the code from your confirmation email.");
const unsafePath = (value: string) => value.includes("\\") || [...value].some((character) => character.charCodeAt(0) <= 32);

/** Only known internal app routes are valid continuations. Never trust a query parameter. */
export function safeNext(raw?: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || unsafePath(raw)) return paths.profile();
  try {
    const url = new URL(raw, "https://silvet.invalid");
    const pathname = decodeURIComponent(url.pathname);
    if (url.origin !== "https://silvet.invalid" || unsafePath(pathname)) return paths.profile();
    if (!/^\/app(?:\/(?:profile|style|ideas|wardrobe(?:\/[\w-]+(?:\/edit)?)?|lookbook(?:\/[\w-]+)?))?\/?$/.test(pathname)) return paths.profile();
    return url.pathname + url.search;
  } catch { return paths.profile(); }
}

const continuationKey = "silvet.auth.next.v1";
export function readNext(): string {
  try { return safeNext(sessionStorage.getItem(continuationKey)); }
  catch { return paths.profile(); }
}
export function rememberNext(next?: string) {
  try { sessionStorage.setItem(continuationKey, safeNext(next)); } catch { /* Safe default when browser storage is unavailable. */ }
}
export function consumeNext(): string {
  try {
    const next = sessionStorage.getItem(continuationKey);
    sessionStorage.removeItem(continuationKey);
    return safeNext(next);
  } catch { return paths.profile(); }
}
export function callbackUrl(): string { return new URL(paths.authCallback(), window.location.origin).href; }

export class AuthFlowError extends Error {
  constructor(message: string, readonly kind: "verification_required" | "network" | "rate_limit" | "unknown" = "unknown") { super(message); }
}
/** Deliberately do not display raw provider messages, URLs or request payloads. */
export function authError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  if (code === "email_not_confirmed") return new AuthFlowError("Confirm your email before signing in. You can request another email below.", "verification_required");
  if (code === "invalid_credentials") return new AuthFlowError("The email or password is incorrect.");
  if (code === "weak_password") return new AuthFlowError("Choose a stronger password that meets the account password policy.");
  if (error instanceof Error && error.name === "AuthPKCECodeVerifierMissingError") return new AuthFlowError("This link needs the browser where you started. Please sign in or verify with the email code.");
  if (code === "otp_expired" || code === "flow_state_expired" || code === "flow_state_not_found") return new AuthFlowError("This confirmation has expired or was already used. Sign in or request a new email.");
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  if (status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return new AuthFlowError("Too many attempts. Please wait before trying again.", "rate_limit");
  if (error instanceof TypeError || status === 0 || (error instanceof Error && /fetch|network|offline/i.test(error.message))) return new AuthFlowError("We couldn’t reach the account service. Check your connection and try again.", "network");
  return new AuthFlowError("We couldn’t complete that request. Please try again.");
}
