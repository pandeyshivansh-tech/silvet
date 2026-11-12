import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { AuthFrame } from "./AuthFrame";
import { VerificationPanel } from "./VerificationPanel";
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
    return <AuthFrame eyebrow="Account" title="Welcome back" description="A considered wardrobe begins with your own point of view."><div aria-label="Checking account" role="status" className="space-y-4"><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /></div></AuthFrame>;
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
    <AuthFrame eyebrow="Account" title="Welcome back" description="Pick up where your wardrobe left off.">
      {verification ? (
        <VerificationPanel initialEmail={email} next={next} onVerified={() => navigate(next, { replace: true })} onClose={() => setVerification(false)} />
      ) : (
        <>
          {auth.error && <p role="alert" className="mb-5 border border-line bg-chalk-deep p-3 text-caption text-graphite-deep">{auth.error} The demo is still open to explore.</p>}
          {error && <p role="alert" className="mb-5 border border-danger p-3 text-caption text-danger">{error}</p>}
          {notice && <p role="status" className="mb-5 border border-line bg-chalk-deep p-3 text-caption text-graphite-deep">{notice}</p>}
          <form noValidate onSubmit={submit} className="space-y-5">
            <TextField ref={emailRef} label="Email address" requiredMark type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); }} error={errors.email} />
            <div>
              <TextField ref={passwordRef} label="Password" requiredMark type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); }} error={errors.password} />
              <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-2 text-caption text-graphite-deep underline underline-offset-4" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>
            <Button type="submit" fullWidth disabled={!auth.isConfigured} loading={submitting} loadingLabel="Signing in">Sign in</Button>
          </form>
          <div className="my-6 flex items-center gap-4 text-caption text-graphite-deep"><span className="h-px flex-1 bg-line" /><span>or</span><span className="h-px flex-1 bg-line" /></div>
          <Button variant="secondary" fullWidth onClick={google} disabled={auth.googleAvailable !== true || submitting} leadingIcon={<span aria-hidden="true" className="font-medium">G</span>}>Continue with Google</Button>
          {auth.googleAvailable !== true && <p className="mt-3 text-caption text-graphite-deep" role="status">{auth.googleAvailable === null ? "Checking Google availability…" : "Google sign-in is not enabled here. Use email and password instead."}</p>}
          <Button variant="quiet" className="mt-4" onClick={() => setVerification(true)}>Verify your email</Button>
          <p className="mt-7 text-body text-graphite-deep">New to SILVET? <Link className="font-medium text-midnight underline underline-offset-4" to={paths.signUp(next)}>Create an account</Link></p>
          <p className="mt-4 text-caption text-graphite-deep"><ArrowUpRight aria-hidden="true" className="mr-1 inline size-3.5" />No account needed to browse the <Link to={paths.wardrobe("/demo")} className="text-midnight underline underline-offset-4">sample wardrobe</Link>.</p>
        </>
      )}
    </AuthFrame>
  );
}
