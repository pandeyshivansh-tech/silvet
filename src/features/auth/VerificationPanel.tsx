import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, TextField } from "@/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authError, emailCodeSchema, signInSchema } from "@/lib/auth/authFlow";

export function VerificationPanel({ initialEmail = "", next, onVerified, onClose }: { initialEmail?: string; next?: string; onVerified: () => void; onClose?: () => void }) {
  const auth = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const lock = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const until = useRef(0);

  useEffect(() => {
    if (!seconds) return;
    const timer = window.setTimeout(() => setSeconds(Math.max(0, Math.ceil((until.current - Date.now()) / 1000))), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (!signInSchema.shape.email.safeParse(email).success) { setError("Enter the email address used to create your account."); emailRef.current?.focus(); return; }
    const parsed = emailCodeSchema.safeParse(code);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Enter the code from your confirmation email."); codeRef.current?.focus(); return; }
    lock.current = true;
    setWorking(true);
    setError("");
    void auth.verifyEmail(email, parsed.data).then(onVerified).catch((reason: unknown) => setError(authError(reason).message))
      .finally(() => { lock.current = false; setWorking(false); setCode(""); });
  }

  function resend() {
    if (lock.current || seconds > 0) return;
    if (!signInSchema.shape.email.safeParse(email).success) { setError("Enter a valid email address to request a new code."); emailRef.current?.focus(); return; }
    lock.current = true;
    setWorking(true);
    setError("");
    void auth.resend(email, next).then(() => {
      until.current = Date.now() + 60_000;
      setSeconds(60);
    }).catch((reason: unknown) => {
      const safe = authError(reason);
      setError(safe.message);
      if (safe.kind === "rate_limit") {
        until.current = Date.now() + 60_000;
        setSeconds(60);
      }
    })
      .finally(() => { lock.current = false; setWorking(false); });
  }

  return (
    <div>
      <p className="eyebrow mb-3">Email confirmation</p>
      <h2 className="font-display text-look text-midnight lg:text-look-lg">Check your inbox</h2>
      <p className="mt-2 text-body text-graphite-deep">Follow the link in your confirmation email in the browser where you started, or enter its 6–10 digit code here. You can return after a reload and enter your email again.</p>
      {error && <p role="alert" className="mt-5 border border-danger p-3 text-caption text-danger">{error}</p>}
      <form noValidate onSubmit={verify} className="mt-6 space-y-5">
        <TextField ref={emailRef} label="Email address" requiredMark type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextField ref={codeRef} label="Confirmation code" requiredMark inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))} hint="Digits only." />
        <Button type="submit" fullWidth loading={working} loadingLabel="Confirming">Confirm email</Button>
      </form>
      <Button variant="quiet" className="mt-5 min-h-11" disabled={working || seconds > 0} onClick={resend}>{seconds > 0 ? `Send another code in ${seconds}s` : "Resend confirmation email"}</Button>
      {onClose && <div className="mt-4"><Button variant="quiet" onClick={onClose}>Back to sign in</Button></div>}
    </div>
  );
}
