import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, ButtonLink, Chip, ChipRow, ErrorState, Skeleton, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProfile, useUpdateProfile } from "@/data/profiles/hooks";
import { STYLES, type StyleSlug } from "@/domain/taxonomy";
import { authError } from "@/lib/auth/authFlow";
import type { UserProfile } from "@/domain/types";
import { profileInputSchema } from "@/domain/profileSchema";
import { useUnsavedChanges } from "@/lib/UnsavedChanges";

function ProfileForm({ saved }: { saved: UserProfile }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(saved.displayName ?? "");
  const [styles, setStyles] = useState<StyleSlug[]>(saved.stylePreferences);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const lock = useRef(false);
  const dirty = name !== (saved.displayName ?? "") || JSON.stringify(styles) !== JSON.stringify(saved.stylePreferences);
  const guard = useUnsavedChanges(dirty);
  return <form noValidate className="mt-7 space-y-5" onSubmit={(event) => {
    event.preventDefault();
    if (lock.current) return;
    const parsed = profileInputSchema.safeParse({ displayName: name, stylePreferences: styles });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your profile."); return; }
    lock.current = true; setError(""); setSuccess(false);
    void update.mutateAsync(parsed.data).then(() => {
      setName(parsed.data.displayName ?? ""); setSuccess(true);
    }).catch(() => setError("Your profile wasn’t saved. Your changes are still here; please retry."))
      .finally(() => { lock.current = false; });
  }}>
    {guard.prompt}
    <TextField label="Display name" optional autoComplete="name" maxLength={80} value={name} disabled={update.isPending}
      onChange={(event) => { setName(event.target.value); setSuccess(false); }} />
    <fieldset disabled={update.isPending}>
      <legend className="text-ui font-medium text-midnight">Edit style preferences</legend>
      <ChipRow label="Edit style preferences" className="mt-3 flex-wrap overflow-visible">
        {STYLES.map((style) => <Chip key={style.slug} selected={styles.includes(style.slug)} disabled={update.isPending} onClick={() => {
          setStyles((current) => current.includes(style.slug) ? current.filter((value) => value !== style.slug) : [...current, style.slug]);
          setSuccess(false);
        }}>{style.label}</Chip>)}
      </ChipRow>
    </fieldset>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {success && <p role="status">Your profile is saved.</p>}
    <Button type="submit" disabled={!dirty} loading={update.isPending} loadingLabel="Saving profile">Save profile</Button>
  </form>;
}

export default function ProfilePage() {
  const profile = useProfile();
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [signingOut, setSigningOut] = useState(false);

  function signOut() {
    if (lock.current) return;
    lock.current = true;
    setSigningOut(true);
    setError("");
    void auth.signOut().then(() => navigate(paths.landing(), { replace: true }))
      .catch((reason: unknown) => setError(authError(reason).message))
      .finally(() => { lock.current = false; setSigningOut(false); });
  }

  return (
    <main className="min-h-dvh bg-chalk px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow mb-3">Account</p>
        <h1 className="font-display text-page text-midnight lg:text-page-lg">Your profile</h1>
        <p className="mt-3 max-w-xl text-body text-graphite-deep">A small summary of the details you chose to share with SILVET.</p>
        {error && <p role="alert" className="mt-6 border border-danger p-3 text-caption text-danger">{error}</p>}
        {profile.isPending ? (
          <section aria-label="Loading your profile" role="status" className="mt-10 max-w-xl space-y-5">
            <Skeleton className="h-24 w-full" /><Skeleton className="h-16 w-2/3" /><Skeleton className="h-12 w-36" />
          </section>
        ) : profile.isError || !profile.data ? (
          <div className="mt-8 max-w-xl">
            <ErrorState error={profile.error} title="Your account summary did not load." onRetry={() => void profile.refetch()} />
            <Button variant="secondary" onClick={signOut} loading={signingOut} loadingLabel="Signing out">Sign out</Button>
          </div>
        ) : (
          <>
            <section className="mt-10 max-w-2xl border-y border-line py-7">
              <dl className="grid gap-7 sm:grid-cols-2">
                <div><dt className="text-caption text-graphite-deep">Email</dt><dd className="mt-1 break-all text-ui font-medium text-midnight">{auth.user?.email ?? "Email not available"}</dd></div>
                <div className="min-w-0"><dt className="text-caption text-graphite-deep">Display name</dt><dd className="mt-1 break-words text-ui font-medium text-midnight">{profile.data.displayName || "Not set"}</dd></div>
              </dl>
              <div className="mt-7">
                <h2 className="text-ui font-medium text-midnight">Style preferences</h2>
                {profile.data.stylePreferences.length ? (
                  <ChipRow label="Saved style preferences" className="mt-2 flex-wrap overflow-visible">
                    {profile.data.stylePreferences.map((slug) => <Chip key={slug} selected disabled>{STYLES.find((style) => style.slug === slug)?.label ?? slug}</Chip>)}
                  </ChipRow>
                ) : <p className="mt-2 text-caption text-graphite-deep">No preferences added yet.</p>}
              </div>
            </section>
            <div className="max-w-2xl"><ProfileForm key={profile.data.id} saved={profile.data} /></div>
            <div className="mt-7 flex flex-col items-start gap-5">
              <div className="flex flex-wrap gap-3">
                <ButtonLink to={paths.wardrobe("/app")}>Personal wardrobe</ButtonLink>
                <ButtonLink to={paths.style("/app")} variant="secondary">Open Studio</ButtonLink>
                <ButtonLink to={paths.lookbook("/app")} variant="secondary">Open Lookbook</ButtonLink>
              </div>
              <Button variant="secondary" onClick={signOut} loading={signingOut} loadingLabel="Signing out">Sign out</Button>
              <p className="max-w-lg text-caption text-graphite-deep">Want to look around first? <Link className="text-midnight underline underline-offset-4" to={paths.wardrobe("/demo")}>Visit the demo wardrobe</Link>. It contains sample pieces, not your personal clothes.</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
