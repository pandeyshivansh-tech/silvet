import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/ui";

/** Google's own four-colour "G" (Google Identity branding guidelines). Brand colours are part of the mark, so they stay as-is. */
export function GoogleMark({ className = "size-[1.125rem]" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * Google first, then "or with email" (SILVET_DESIGN_REFERENCE.pdf p14). Availability is the provider check's
 * answer: null while checking, false when the project has no Google provider — the button stays visible but
 * disabled and the line under it says why, so nobody is sent to a broken OAuth screen.
 */
export function GoogleOption({ available, busy, onClick, offMessage }: { available: boolean | null; busy: boolean; onClick: () => void; offMessage: string }) {
  return (
    <div>
      <Button variant="secondary" fullWidth onClick={onClick} disabled={available !== true || busy} leadingIcon={<GoogleMark />}>Continue with Google</Button>
      {available !== true && <p className="mt-2 text-caption text-graphite-deep" role="status">{available === null ? "Checking Google availability…" : offMessage}</p>}
      <div className="my-6 flex items-center gap-4 text-caption text-graphite-deep" aria-hidden="true">
        <span className="h-px flex-1 bg-line" /><span>or with email</span><span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

/** "Show"/"Hide" inside the password box; the accessible name says what it shows. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? "Hide password" : "Show password"}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs px-3 text-caption font-medium text-midnight underline underline-offset-4 hover:bg-chalk-deep">
      {shown ? "Hide" : "Show"}
    </button>
  );
}

/** Form-level messages (p17): errors get a Danger border and "!" icon with Midnight text; notes sit on Chalk Deep. */
export function AuthMessage({ tone = "error", children, className }: { tone?: "error" | "note"; children: ReactNode; className?: string }) {
  if (tone === "note") {
    return <p role="status" className={`border border-line bg-chalk-deep p-3 text-caption text-graphite-deep ${className ?? ""}`}>{children}</p>;
  }
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-xs border border-danger p-3 text-caption text-midnight ${className ?? ""}`}>
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}
