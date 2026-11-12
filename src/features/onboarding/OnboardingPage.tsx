import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import type { UserProfile } from "@/domain/types";
import { Button, Chip, ChipRow, ErrorState, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCompleteOnboarding, useProfile } from "@/data/profiles/hooks";
import { profileInputSchema } from "@/domain/profileSchema";
import { STYLES, type StyleSlug } from "@/domain/taxonomy";
import { safeNext } from "@/lib/auth/authFlow";

function OnboardingForm({ saved, next }: { saved: UserProfile; next: string }) {
  const complete = useCompleteOnboarding();
  const navigate = useNavigate();
  const [name, setName] = useState(saved.displayName ?? "");
  const [styles, setStyles] = useState<StyleSlug[]>(saved.stylePreferences);
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [working, setWorking] = useState(false);

  async function save(skip: boolean) {
    if (lock.current) return;
    const validated = profileInputSchema.safeParse(skip
      ? { displayName: saved.displayName, stylePreferences: saved.stylePreferences }
      : { displayName: name, stylePreferences: styles });
    if (!validated.success) {
      const issue = validated.error.issues[0];
      setNameError(issue?.path[0] === "displayName" ? issue.message : "");
      setError(issue?.path[0] === "displayName" ? "" : issue?.message ?? "Check your selections.");
      return;
    }
    setNameError("");
    setError("");
    lock.current = true;
    setWorking(true);
    try {
      await complete.mutateAsync({ ...validated.data, ...(skip ? { skip: true } : {}) });
      navigate(next, { replace: true });
    } catch {
      setError("We couldn’t save your preferences. Your entries are still here; try again.");
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  function toggleStyle(slug: StyleSlug) {
    setStyles((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
    setError("");
  }

  return (
    <main className="min-h-dvh bg-chalk px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-4">A little about your style</p>
        <h1 className="max-w-2xl font-display text-page text-midnight lg:text-page-lg">Make this space feel like yours.</h1>
        <p className="mt-4 max-w-xl text-lead text-graphite-deep">Optional details help SILVET understand what you enjoy wearing, from everyday Western staples to Indian occasionwear.</p>
        {error && <p role="alert" className="mt-7 border border-danger p-3 text-caption text-danger">{error}</p>}
        <form noValidate className="mt-9 space-y-9" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(false); }}>
          <TextField label="What should we call you?" optional autoComplete="name" maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setNameError(""); }} error={nameError} hint="You can leave this blank." />
          <fieldset>
            <legend className="text-ui font-medium text-midnight">Styles you reach for <span className="ml-2 text-caption font-normal text-graphite-deep">optional · choose any</span></legend>
            <p className="mt-2 text-caption text-graphite-deep">Select all that feel right. Traditional, fusion and contemporary styles all belong here.</p>
            <ChipRow label="Choose style preferences" className="mt-3 flex-wrap overflow-visible">
              {STYLES.map((style) => <Chip key={style.slug} selected={styles.includes(style.slug)} onClick={() => toggleStyle(style.slug)}>{style.label}</Chip>)}
            </ChipRow>
          </fieldset>
          <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
            <Button type="submit" loading={working} loadingLabel="Saving preferences">Save and continue</Button>
            <Button variant="quiet" disabled={working} onClick={() => void save(true)}>Skip for now</Button>
          </div>
        </form>
        <p className="mt-10 text-caption text-graphite-deep"><Link to={paths.wardrobe("/demo")} className="underline underline-offset-4">Explore the sample wardrobe</Link>. Your account preferences stay separate.</p>
      </div>
    </main>
  );
}

function OnboardingContent() {
  const profile = useProfile();
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const lock = useRef(false);
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  function signOut() {
    if (lock.current) return;
    lock.current = true;
    setSigningOut(true);
    setSignOutError("");
    void auth.signOut().then(() => navigate(paths.landing(), { replace: true }))
      .catch(() => setSignOutError("We couldn’t sign you out. Please try again."))
      .finally(() => { lock.current = false; setSigningOut(false); });
  }

  if (profile.isPending) return <main className="mx-auto min-h-dvh max-w-3xl px-5 py-10 sm:px-8 lg:px-10"><div role="status" aria-label="Loading your profile" className="space-y-5"><div className="skeleton h-3 w-28 rounded-xs" /><div className="skeleton h-14 w-3/4 rounded-xs" /><div className="skeleton h-12 rounded-xs" /><div className="skeleton h-24 rounded-xs" /></div></main>;
  if (profile.isError || !profile.data) return <main className="mx-auto min-h-dvh max-w-3xl px-5 py-10 sm:px-8 lg:px-10"><p className="eyebrow mb-3">Your account</p><ErrorState error={profile.error} title="Your profile did not load." onRetry={() => void profile.refetch()} /><Button variant="secondary" onClick={signOut} loading={signingOut} loadingLabel="Signing out">Sign out</Button>{signOutError && <p role="alert" className="mt-3 text-caption text-danger">{signOutError}</p>}</main>;
  if (profile.data.onboardingCompletedAt) return <Navigate to={next} replace />;
  return <OnboardingForm key={profile.data.id} saved={profile.data} next={next} />;
}

export default function OnboardingPage() {
  return <RequireAuth><OnboardingContent /></RequireAuth>;
}
