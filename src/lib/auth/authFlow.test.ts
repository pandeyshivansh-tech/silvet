import { describe, expect, it } from "vitest";
import { authError, safeNext, signInSchema, signUpSchema, emailCodeSchema } from "./authFlow";
import { profileInputSchema } from "@/domain/profileSchema";

describe("safe authentication continuation", () => {
  it("allows the approved Ideas entry point without allowing off-site redirects", () => {
    expect(safeNext("/app/ideas")).toBe("/app/ideas");
    expect(safeNext("//evil.test/app/ideas")).toBe("/app/profile");
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/auth/callback", "/onboarding", "/app/../../auth/sign-in", "/app/%5c%5cevil", "/app/%0aevil", "/app/%", "/app/profile bad", "javascript:alert(1)", "/app//evil"])("rejects %s", (input) => expect(safeNext(input)).toBe("/app/profile"));
  it.each(["/app", "/app/profile", "/app/wardrobe", "/app/wardrobe/item-1/edit", "/app/style?mode=ideas", "/app/lookbook/outfit-1"])("preserves %s", (input) => expect(safeNext(input)).toBe(input));
});
describe("auth and onboarding inputs", () => {
  it("trims signup names and email but never trims passwords", () => {
    expect(signUpSchema.parse({ displayName: " New name ", email: " a@example.com ", password: " password " }))
      .toMatchObject({ displayName: "New name", email: "a@example.com", password: " password " });
  });
  it("requires a usable display name at signup", () => {
    expect(signUpSchema.safeParse({ displayName: "  ", email: "a@example.com", password: "password" }).success).toBe(false);
    expect(signUpSchema.safeParse({ displayName: "x".repeat(81), email: "a@example.com", password: "password" }).success).toBe(false);
  });
  it("accepts older short passwords for login, not for new signup", () => {
    expect(signInSchema.safeParse({ email: "a@example.com", password: "abc" }).success).toBe(true);
    expect(signUpSchema.safeParse({ email: "a@example.com", password: "abc" }).success).toBe(false);
  });
  it.each(["", "abc123", "12345", "12345678901"])("rejects invalid email code %s", (code) => expect(emailCodeSchema.safeParse(code).success).toBe(false));
  it("accepts configured email-code lengths", () => expect(emailCodeSchema.safeParse("12345678").success).toBe(true));
  it("normalizes optional display names and retains Indian style choices", () => {
    expect(profileInputSchema.parse({ displayName: "  ", stylePreferences: ["fusion", "traditional", "fusion"] })).toEqual({ displayName: null, stylePreferences: ["fusion", "traditional"] });
  });
  it("rejects unknown preferences and overlong names", () => {
    expect(profileInputSchema.safeParse({ displayName: "x".repeat(81), stylePreferences: [] }).success).toBe(false);
    expect(profileInputSchema.safeParse({ displayName: null, stylePreferences: ["invented"] }).success).toBe(false);
  });
});
describe("sanitized authentication errors", () => {
  it("never echoes an untrusted server error", () => expect(authError(new Error("password=PRIVATE&code=PRIVATE")).message).not.toContain("PRIVATE"));
  it("provides confirmation guidance", () => expect(authError({ code: "email_not_confirmed" }).kind).toBe("verification_required"));
  it("reports throttling", () => expect(authError({ status: 429 }).kind).toBe("rate_limit"));
  it("reports network errors", () => expect(authError(new TypeError("Failed to fetch")).kind).toBe("network"));
  it("explains expired links", () => expect(authError({ code: "otp_expired" }).message).toContain("expired"));
});
