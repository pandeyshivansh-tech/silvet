import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CircleAlert } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button, Chip, ChipRow, ErrorState, Page, PageHeader, Skeleton, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProfile, useUpdateProfile } from "@/data/profiles/hooks";
import { STYLES, stylesByGroup, type StyleSlug } from "@/domain/taxonomy";
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
  return <form noValidate className="space-y-8" onSubmit={(event) => {
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
      <legend className="flex w-full items-baseline justify-between gap-3 text-ui font-medium text-midnight">
        <span>Edit style preferences</span>
        <span className="text-caption font-normal text-graphite-deep">{styles.length ? `${styles.length} chosen` : "optional · choose any"}</span>
      </legend>
      <div className="mt-5 space-y-6">
        {stylesByGroup().map((group) => (
          <div key={group.slug}>
            <h3 className="font-display text-lead-lg text-midnight">{group.label}</h3>
            <p className="mt-0.5 max-w-lg text-caption text-graphite-deep">{group.hint}</p>
            <ChipRow label={group.label} className="mt-3 flex-wrap overflow-visible">
              {group.styles.map((style) => <Chip key={style.slug} selected={styles.includes(style.slug)} disabled={update.isPending} onClick={() => {
                setStyles((current) => current.includes(style.slug) ? current.filter((value) => value !== style.slug) : [...current, style.slug]);
                setSuccess(false);
              }}>{style.label}</Chip>)}
            </ChipRow>
          </div>
        ))}
      </div>
    </fieldset>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-5">
      <Button type="submit" disabled={!dirty} loading={update.isPending} loadingLabel="Saving profile">Save profile</Button>
      {error && <p role="alert" className="flex items-start gap-2 text-caption text-midnight"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} />{error}</p>}
      {success && <p role="status" className="flex items-center gap-1.5 text-caption text-midnight"><Check aria-hidden="true" className="size-4" strokeWidth={2} />Your profile is saved.</p>}
      {!error && !success && <p className="text-caption text-graphite-deep">{dirty ? "You have unsaved changes." : "No changes yet."}</p>}
    </div>
  </form>;
}

/** The account at a glance — the page's one Midnight panel: who is signed in, the style they chose, and the way out. */
function Identity({ profile, email, signOut, signingOut }: { profile: UserProfile; email: string | null; signOut: () => void; signingOut: boolean }) {
  const name = profile.displayName?.trim();
  const chosen = profile.stylePreferences.flatMap((slug) => STYLES.filter((style) => style.slug === slug));
  return (
    <section aria-label="Your account" className="surface-midnight rounded-xs p-5 sm:p-8">
      <div className="flex items-start gap-4 sm:gap-5">
        <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-full border border-midnight-muted font-display text-section text-chalk">
          {(name || email || "S").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-look text-chalk wrap-anywhere sm:text-section">{name || "No display name yet"}</h2>
          <p className="mt-1 text-body text-midnight-muted wrap-anywhere">{email ?? "Email not available"}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-5 border-t border-midnight-muted/30 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-caption text-midnight-muted">Your style</h3>
          {chosen.length ? (
            <ul aria-label="Saved style preferences" className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {chosen.map((style) => <li key={style.slug} className="flex items-center gap-2 text-ui text-chalk"><span aria-hidden="true" className="size-1.5 rounded-full bg-citron" />{style.label}</li>)}
            </ul>
          ) : <p className="mt-2 text-ui text-chalk">No styles chosen yet. Pick some below.</p>}
        </div>
        <Button variant="secondary" onClick={signOut} loading={signingOut} loadingLabel="Signing out" arrow={false} className="shrink-0 self-start sm:self-auto">Sign out</Button>
      </div>
    </section>
  );
}

const spaces = [
  { to: paths.wardrobe("/app"), label: "Personal wardrobe", note: "Your own pieces" },
  { to: paths.style("/app"), label: "Open Studio", note: "Build a look, or get an idea" },
  { to: paths.lookbook("/app"), label: "Open Lookbook", note: "Looks you’ve saved" },
] as const;

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
    <Page>
      <PageHeader eyebrow="Account" title="Your profile" lede="How SILVET knows you. Your name and styles shape the looks Ideas suggests; only you can see them." />
      {error && <p role="alert" className="mb-6 flex items-start gap-2 rounded-xs border border-danger p-3 text-caption text-midnight"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} />{error}</p>}
      {profile.isPending ? (
        <section aria-label="Loading your profile" role="status" className="space-y-5">
          <Skeleton className="h-40 w-full" /><Skeleton className="h-16 w-2/3" /><Skeleton className="h-12 w-36" />
        </section>
      ) : profile.isError || !profile.data ? (
        <div className="max-w-xl">
          <ErrorState error={profile.error} title="Your account summary did not load." onRetry={() => void profile.refetch()} />
          <Button variant="secondary" onClick={signOut} loading={signingOut} loadingLabel="Signing out">Sign out</Button>
        </div>
      ) : (
        <>
          <Identity profile={profile.data} email={auth.user?.email ?? null} signOut={signOut} signingOut={signingOut} />
          <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-12">
            <section aria-labelledby="edit-profile">
              <h2 id="edit-profile" className="font-display text-look text-midnight lg:text-look-lg">Edit your profile</h2>
              <p className="mt-1 mb-6 text-caption text-graphite-deep">Change these whenever your style does.</p>
              <ProfileForm key={profile.data.id} saved={profile.data} />
            </section>
            <aside className="space-y-8 lg:border-l lg:border-line lg:pl-10">
              <nav aria-label="Your spaces">
                <h2 className="text-ui font-medium text-midnight">Your spaces</h2>
                <ul className="mt-2 border-t border-line">
                  {spaces.map((space) => (
                    <li key={space.label} className="border-b border-line">
                      <Link to={space.to} className="group flex min-h-14 items-center justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="block text-ui font-medium text-midnight group-hover:underline group-hover:underline-offset-4">{space.label}</span>
                          <span className="block text-caption text-graphite-deep">{space.note}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-midnight transition-transform duration-120 ease-editorial group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <section aria-labelledby="sample-wardrobe" className="rounded-xs border border-dashed border-line-strong p-4">
                <h2 id="sample-wardrobe" className="text-ui font-medium text-midnight">The sample wardrobe</h2>
                <p className="mt-1 text-caption text-graphite-deep">Sample pieces for trying Studio and Ideas. They aren’t yours, and looks saved there disappear when you close the tab.</p>
                <Link className="mt-2 inline-flex min-h-11 items-center gap-1 text-caption font-medium text-midnight underline underline-offset-4" to={paths.wardrobe("/demo")}>Visit the sample wardrobe <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>
              </section>
            </aside>
          </div>
        </>
      )}
    </Page>
  );
}
