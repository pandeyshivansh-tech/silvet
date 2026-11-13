import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { AuthFrame } from "./AuthFrame";
import { AuthMessage, GoogleOption, PasswordToggle } from "./AuthParts";
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
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => checkProviders(), [checkProviders, auth.isConfigured]);

  if (auth.status === "loading") {
    return <AuthFrame title="Create your wardrobe" description="Your clothes and looks are private to your account."><div aria-label="Checking account" role="status" className="space-y-4"><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-12 rounded-xs" /></div></AuthFrame>;
  }
  if (auth.status === "signed-in") return <Navigate to={next} replace />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const result = signUpSchema.safeParse({ displayName, email, password });
    if (!result.success) {
      const nextErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "displayName" && !nextErrors.displayName) nextErrors.displayName = issue.message;
        if (issue.path[0] === "email" && !nextErrors.email) nextErrors.email = issue.message;
        if (issue.path[0] === "password" && !nextErrors.password) nextErrors.password = issue.message;
      }
      setErrors(nextErrors);
      if (nextErrors.displayName) nameRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    setErrors({});
    setError("");
    lock.current = true;
    setSubmitting(true);
    const submittedPassword = password;
    setPassword("");
    void auth.signUp(result.data.displayName, result.data.email, submittedPassword, next)
      .then(({ status }) => {
        if (status === "signed_in") navigate(next, { replace: true });
        else setSessionUnavailable(true);
      })
      .catch((reason: unknown) => setError(authError(reason).message))
      .finally(() => { lock.current = false; setSubmitting(false); });
  }

  function google() {
    if (lock.current || auth.googleAvailable !== true) return;
    lock.current = true;
    setSubmitting(true);
    setError("");
    void auth.signInWithGoogle(next).catch((reason: unknown) => setError(authError(reason).message)).finally(() => { lock.current = false; setSubmitting(false); });
  }

  return (
    <AuthFrame title="Create your wardrobe" description={sessionUnavailable ? undefined : "Your clothes and looks are private to your account."} sampleNote={!sessionUnavailable}>
      {sessionUnavailable ? (
        <section className="border-l-2 border-midnight pl-5">
          <h2 className="font-display text-look text-midnight">No sign-in session was returned</h2>
          <p role="status" className="mt-3 text-body text-graphite-deep">SILVET has not signed you in, so your personal app is still locked. If Supabase sent an email, follow its instructions. For immediate signup, the project’s email-confirmation setting must be turned off.</p>
          <p className="mt-5 text-body text-graphite-deep">You can also <Link className="font-medium text-midnight underline underline-offset-4" to={paths.signIn(next)}>try signing in</Link>.</p>
        </section>
      ) : (
        <>
          {auth.error && <AuthMessage tone="note" className="mb-5">{auth.error} The demo is still open to explore.</AuthMessage>}
          {error && <AuthMessage className="mb-5">{error}</AuthMessage>}
          <GoogleOption available={auth.googleAvailable} busy={submitting} onClick={google} offMessage="Google sign-in is not enabled here. Create an account with email instead." />
          <form noValidate onSubmit={submit} className="space-y-4 sm:space-y-5">
            <TextField ref={nameRef} label="Your name" autoComplete="name" maxLength={80} value={displayName}
              onChange={(event) => { setDisplayName(event.target.value); setErrors((old) => ({ ...old, displayName: undefined })); }} error={errors.displayName} />
            <TextField ref={emailRef} label="Email address" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })); }} error={errors.email} />
            <TextField ref={passwordRef} label="Create a password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((old) => ({ ...old, password: undefined })); }} error={errors.password} hint="At least 8 characters."
              trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />} />
            <Button type="submit" fullWidth disabled={!auth.isConfigured} loading={submitting} loadingLabel="Creating account">Create account</Button>
          </form>
          <p className="mt-6 text-body text-graphite-deep">Already have an account? <Link className="font-medium text-midnight underline underline-offset-4" to={paths.signIn(next)}>Sign in</Link></p>
        </>
      )}
    </AuthFrame>
  );
}
