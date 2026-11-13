import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { AuthFrame } from "./AuthFrame";
import { VerificationPanel } from "./VerificationPanel";
import { AuthMessage, GoogleOption, PasswordToggle } from "./AuthParts";
import { Button, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authError, safeNext, signInSchema } from "@/lib/auth/authFlow";

export default function SignInPage() {
  const auth = useAuth();
  const { checkProviders } = auth;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [verification, setVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => checkProviders(), [checkProviders, auth.isConfigured]);

  if (auth.status === "loading") {
    return <AuthFrame title="Welcome back" description="Pick up where your wardrobe left off."><div aria-label="Checking account" role="status" className="space-y-4"><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /></div></AuthFrame>;
  }
  if (auth.status === "signed-in") return <Navigate to={next} replace />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const nextErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "email" && !nextErrors.email) nextErrors.email = issue.message;
        if (issue.path[0] === "password" && !nextErrors.password) nextErrors.password = issue.message;
      }
      setErrors(nextErrors);
      setError("");
      setNotice("");
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    setErrors({});
    setError("");
    setNotice("");
    lock.current = true;
    setSubmitting(true);
    const submittedPassword = password;
    setPassword("");
    void auth.signIn(result.data.email, submittedPassword)
      .then(() => navigate(next, { replace: true }))
      .catch((reason: unknown) => {
        const safe = authError(reason);
        if (safe.kind === "verification_required") setVerification(true);
        else setError(safe.message);
      })
      .finally(() => { lock.current = false; setSubmitting(false); });
  }

  function google() {
    if (lock.current || auth.googleAvailable !== true) return;
    lock.current = true;
    setError("");
    setNotice("");
    setSubmitting(true);
    void auth.signInWithGoogle(next)
      .catch((reason: unknown) => setError(authError(reason).message))
      .finally(() => { lock.current = false; setSubmitting(false); });
  }

  return (
    <AuthFrame title="Welcome back" description="Pick up where your wardrobe left off." sampleNote={!verification}>
      {verification ? (
        <VerificationPanel initialEmail={email} next={next} onVerified={() => navigate(next, { replace: true })} onClose={() => setVerification(false)} />
      ) : (
        <>
          {auth.error && <AuthMessage tone="note" className="mb-5">{auth.error} The demo is still open to explore.</AuthMessage>}
          {error && <AuthMessage className="mb-5">{error}</AuthMessage>}
          {notice && <AuthMessage tone="note" className="mb-5">{notice}</AuthMessage>}
          <GoogleOption available={auth.googleAvailable} busy={submitting} onClick={google} offMessage="Google sign-in is not enabled here. Use email and password instead." />
          <form noValidate onSubmit={submit} className="space-y-4 sm:space-y-5">
            <TextField ref={emailRef} label="Email address" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); }} error={errors.email} />
            <div>
              <TextField ref={passwordRef} label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); }} error={errors.password}
                trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />} />
              <div className="flex justify-end">
                <Link to={paths.resetPassword()} className="inline-flex min-h-11 items-center text-caption text-midnight underline underline-offset-4">Forgot password?</Link>
              </div>
            </div>
            <Button type="submit" fullWidth disabled={!auth.isConfigured} loading={submitting} loadingLabel="Signing in">Sign in</Button>
          </form>
          <p className="mt-6 text-body text-graphite-deep">New here? <Link className="font-medium text-midnight underline underline-offset-4" to={paths.signUp(next)}>Create your wardrobe</Link></p>
          <Button variant="quiet" className="mt-3 min-h-11" onClick={() => setVerification(true)}>Verify a legacy account</Button>
        </>
      )}
    </AuthFrame>
  );
}
