import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { AuthFrame } from "./AuthFrame";
import { VerificationPanel } from "./VerificationPanel";
import { Button, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authError, safeNext, signUpSchema } from "@/lib/auth/authFlow";

export default function SignUpPage() {
  const auth = useAuth();
  const { checkProviders } = auth;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => checkProviders(), [checkProviders, auth.isConfigured]);

  if (auth.status === "loading") {
    return <AuthFrame eyebrow="Create account" title="A wardrobe, on your terms" description="Indian and Western fashion, side by side."><div aria-label="Checking account" role="status" className="space-y-4"><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /></div></AuthFrame>;
  }
  if (auth.status === "signed-in") return <Navigate to={next} replace />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const result = signUpSchema.safeParse({ email, password });
    if (!result.success) {
      const nextErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "email" && !nextErrors.email) nextErrors.email = issue.message;
        if (issue.path[0] === "password" && !nextErrors.password) nextErrors.password = issue.message;
      }
      setErrors(nextErrors);
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    setErrors({});
    setError("");
    lock.current = true;
    setSubmitting(true);
    const submittedPassword = password;
    setPassword("");
    void auth.signUp(result.data.email, submittedPassword, next)
      .then(({ needsVerification }) => {
        if (needsVerification) setPendingVerification(true);
        else navigate(next, { replace: true });
      })
      .catch((reason: unknown) => setError(authError(reason).message))
      .finally(() => { lock.current = false; setSubmitting(false); });
  }

  return (
    <AuthFrame eyebrow="Create account" title="A wardrobe, on your terms" description="Indian and Western fashion, side by side. Your style, your own space.">
      {pendingVerification ? (
        <VerificationPanel initialEmail={email} next={next} onVerified={() => navigate(next, { replace: true })} onClose={() => setPendingVerification(false)} />
      ) : (
        <>
          {auth.error && <p role="alert" className="mb-5 border border-line bg-chalk-deep p-3 text-caption text-graphite-deep">{auth.error} The demo is still open to explore.</p>}
          {error && <p role="alert" className="mb-5 border border-danger p-3 text-caption text-danger">{error}</p>}
          <form noValidate onSubmit={submit} className="space-y-5">
            <TextField ref={emailRef} label="Email address" requiredMark type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); }} error={errors.email} />
            <TextField ref={passwordRef} label="Create a password" requiredMark type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); }} error={errors.password} hint="At least 8 characters." />
            <Button type="submit" fullWidth disabled={!auth.isConfigured} loading={submitting} loadingLabel="Creating account">Create account</Button>
          </form>
          <div className="my-6 flex items-center gap-4 text-caption text-graphite-deep"><span className="h-px flex-1 bg-line" /><span>or</span><span className="h-px flex-1 bg-line" /></div>
          <Button variant="secondary" fullWidth disabled={auth.googleAvailable !== true || submitting} onClick={() => {
            if (lock.current || auth.googleAvailable !== true) return;
            lock.current = true;
            setSubmitting(true);
            setError("");
            void auth.signInWithGoogle(next).catch((reason: unknown) => setError(authError(reason).message)).finally(() => { lock.current = false; setSubmitting(false); });
          }} leadingIcon={<span aria-hidden="true" className="font-medium">G</span>}>Continue with Google</Button>
          {auth.googleAvailable !== true && <p className="mt-3 text-caption text-graphite-deep" role="status">{auth.googleAvailable === null ? "Checking Google availability…" : "Google sign-in is not enabled here. Create an account with email instead."}</p>}
          <p className="mt-7 text-body text-graphite-deep">Already have an account? <Link className="font-medium text-midnight underline underline-offset-4" to={paths.signIn(next)}>Sign in</Link></p>
          <Button variant="quiet" className="mt-3" onClick={() => setPendingVerification(true)}>Verify your email</Button>
        </>
      )}
    </AuthFrame>
  );
}
