import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import type { UserProfile } from "@/domain/types";
import { Button, Chip, ChipRow, ErrorState, Lockup, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCompleteOnboarding, useProfile } from "@/data/profiles/hooks";
import { profileInputSchema } from "@/domain/profileSchema";
import { stylesByGroup, type StyleSlug } from "@/domain/taxonomy";
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

  const answered = [name.trim().length > 0, styles.length > 0] as const;
  const count = answered.filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-chalk">
      <header className="border-b border-line px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <Link to={paths.landing()} aria-label="SILVET home" className="flex min-h-11 flex-1 items-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4"><Lockup size="sm" /></Link>
          <p className="shrink-0 text-caption text-graphite-deep lg:hidden">{count} of 2 answered</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-5 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-12 lg:pt-16 lg:pb-16">
        <section aria-labelledby="onboarding-title" className="lg:sticky lg:top-16 lg:self-start">
          <p className="eyebrow mb-4">Set up your wardrobe</p>
          <h1 id="onboarding-title" className="max-w-md font-display text-page text-midnight lg:text-page-lg">Make this space feel like yours.</h1>
          <p className="mt-4 max-w-md text-lead text-graphite-deep">Two quick, optional questions. Your answers shape the looks SILVET suggests, from everyday Western staples to Indian occasionwear.</p>
          <ol aria-label="Setup progress" className="mt-10 hidden border-t border-line lg:block">
            <ProgressRow n={1} label="Your name" done={answered[0]} detail={answered[0] ? name.trim() : "Optional"} />
            <ProgressRow n={2} label="Your style" done={answered[1]} detail={answered[1] ? `${styles.length} chosen` : "Optional"} />
          </ol>
          <p className="mt-4 hidden text-caption text-graphite-deep lg:block">{count === 2 ? "All set. Save to continue." : "Skip either one; you can change both later in your profile."}</p>
        </section>

        <form noValidate className="min-w-0" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(false); }}>
          {error && <p role="alert" className="mb-8 flex items-start gap-2 rounded-xs border border-danger p-3 text-caption text-midnight"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} />{error}</p>}
          <Step n={1} title="Your name" done={answered[0]}>
            <TextField label="What should we call you?" optional autoComplete="name" maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setNameError(""); }} error={nameError} hint="You can leave this blank." />
          </Step>
          <Step n={2} title="Your style" done={answered[1]} fieldset legend="Styles you reach for" note={styles.length ? `${styles.length} chosen` : "optional · choose any"}>
            <div className="space-y-7">
              {stylesByGroup().map((group) => (
                <div key={group.slug}>
                  <h3 className="font-display text-look text-midnight">{group.label}</h3>
                  <p className="mt-1 max-w-lg text-caption text-graphite-deep">{group.hint}</p>
                  <ChipRow label={group.label} className="mt-3 flex-wrap overflow-visible">
                    {group.styles.map((style) => <Chip key={style.slug} selected={styles.includes(style.slug)} onClick={() => toggleStyle(style.slug)}>{style.label}</Chip>)}
                  </ChipRow>
                </div>
              ))}
            </div>
          </Step>
          <div className="sticky bottom-0 z-10 -mx-5 mt-10 flex flex-wrap items-center gap-3 border-t border-line bg-chalk px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:px-0 lg:pt-6 lg:pb-0">
            <Button type="submit" loading={working} loadingLabel="Saving preferences">Save and continue</Button>
            <Button variant="quiet" disabled={working} onClick={() => void save(true)}>Skip for now</Button>
          </div>
          <p className="mt-6 pb-10 text-caption text-graphite-deep">Just looking? <Link to={paths.wardrobe("/demo")} className="text-midnight underline underline-offset-4">Explore the sample wardrobe</Link>. Your account preferences stay separate.</p>
        </form>
      </main>
    </div>
  );
}

/** A numbered step (the setup is a real sequence); the number turns into a tick once it has an answer. */
function Marker({ n, done }: { n: number; done: boolean }) {
  return (
    <span aria-hidden="true" className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-200 ease-editorial ${done ? "border-midnight bg-midnight text-chalk" : "border-line-strong text-midnight"}`}>
      {done ? <Check className="size-3.5 animate-pop" strokeWidth={2.5} /> : n}
    </span>
  );
}

function ProgressRow({ n, label, done, detail }: { n: number; label: string; done: boolean; detail: string }) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3">
      <Marker n={n} done={done} />
      <span className="text-ui font-medium text-midnight">{label}</span>
      <span className="ml-auto min-w-0 truncate text-caption text-graphite-deep">{done ? <><span className="sr-only">Answered: </span>{detail}</> : detail}</span>
    </li>
  );
}

function Step({ n, title, done, fieldset, legend, note, children }: { n: number; title: string; done: boolean; fieldset?: boolean; legend?: string; note?: string; children: ReactNode }) {
  const heading = (
    <div className="flex items-center gap-3">
      <Marker n={n} done={done} />
      <h2 className="text-caption font-medium text-graphite-deep">Step {n} of 2 · {title}</h2>
    </div>
  );
  return (
    <section className="border-t border-line pt-6 pb-10 first-of-type:border-t-0 first-of-type:pt-0 lg:first-of-type:border-t lg:first-of-type:pt-6">
      {heading}
      <div className="mt-5">
        {fieldset ? (
          <fieldset>
            <legend className="flex w-full items-baseline justify-between gap-3 text-ui font-medium text-midnight">
              <span>{legend}</span>
              {note && <span className="text-caption font-normal text-graphite-deep">{note}</span>}
            </legend>
            <div className="mt-5">{children}</div>
          </fieldset>
        ) : children}
      </div>
    </section>
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
