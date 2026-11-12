# SILVET Supabase — foundation and authentication

Milestone 2 provides the data foundation. Milestone 3 connects Supabase Auth and
the existing profiles table only. `DemoLayout` still creates `DemoRepository`;
no wardrobe/outfit data is switched to Supabase and no sample data is copied into
accounts. `/app/profile` is the minimal authenticated landing page; other `/app`
feature paths show honest readiness screens until SupabaseRepository is approved.

## Public client configuration

- `VITE_SUPABASE_URL`: the HTTPS project origin.
- `VITE_SUPABASE_ANON_KEY`: the modern **`sb_publishable_…`** key. The legacy
  variable name is retained. Legacy public `anon` JWTs also pass shape validation.
- Never use `sb_secret_…` or a legacy `service_role` key in any `VITE_` variable.
  These values become public browser code, even when entered through Secrets.
- Vite validates any supplied configuration before serving/building to prevent
  embedding an elevated key. Both variables can be absent for a demo-only setup.
- `getSupabaseClient()` is lazy; AuthProvider initializes the shared account SDK.
  It uses PKCE, browser localStorage under the auth-specific key `silvet.auth.v1`,
  and SDK-managed user JWT headers. URL auto-detection remains disabled:
  `/auth/callback` explicitly exchanges a code once and removes URL parameters.
- Validation checks key shape/legacy role, not signature, project association,
  revocation or connectivity. No remote calls or credential checks have been made.

## Data model and security

Domain models stay in `src/domain`. Row types in
`src/lib/supabase/database.types.ts` derive from them and map names to snake case;
they are a foundation typing contract, not CLI-generated schema introspection.
Generate/compare official Supabase database types when implementing the repository.

| Table | Role |
|---|---|
| `profiles` | Existing profile fields, keyed by `auth.users.id` |
| `wardrobe_items` | Existing clothing fields, owner, paired private image keys |
| `saved_outfits` | Optional name/notes, existing manual/suggestion source, owner |
| `outfit_items` | Outfit piece slot/position, nullable item reference, owner |
| `clothing_metadata` | Shared, read-only taxonomy constraint allowlists |

RLS is enabled and **forced** on all five tables. Authenticated users get only
SELECT/INSERT/UPDATE/DELETE on their own four user-data tables, with both `USING`
and `WITH CHECK` ownership restrictions. Anonymous clients receive no table
privileges. Authenticated users can read the shared taxonomy but cannot change it.
No client receives TRUNCATE/REFERENCES/TRIGGER privileges. SILVET functions are
security-invoker, with fixed empty search paths and restricted execution grants.

Composite owner foreign keys prevent relating an outfit to another user's item
or associating own items with someone else's outfit, even if IDs are known.
Deleting a wardrobe item nulls **only** its piece reference, preserving the
original outfit/owner/slot/position for `RemovedItemCard`. Outfit deletion cascades
relationships; deleting an auth user cascades their application records.

Name/notes/tag limits, taxonomy values, category/subcategory associations, source,
slots, positions, live duplicate-item/single-slot constraints and image path
ownership are enforced in SQL. `clothing_metadata` is only the constraint
projection of the TypeScript taxonomy; labels, tradition, formality and styling
policy remain in `src/domain/taxonomy.ts`. Parity tests detect allowlist drift.
Do not edit an already applied migration; add a new forward migration.

Full multi-piece completeness, accessory limits/types and slot/type correspondence
remain `checkOutfit()` responsibilities. A later live repository must introduce
an atomic save transaction/RPC that enforces these before enabling client saves;
these migrations alone are **not** the completed outfit-save API.

## Private wardrobe images

Bucket: `wardrobe-images`, **private**, 10 MiB limit, WebP/JPEG/PNG only.
Keys: `<auth-user-uuid>/<wardrobe-item-uuid>/full.webp` and `thumb.webp`, generated
by `wardrobeImagePaths()`. Store keys in the database, not public/signed URLs.

Authenticated SELECT, INSERT and DELETE policies require the first path folder
to equal `auth.uid()`. They never trust a client-supplied object owner field.
Restrictive authenticated/anonymous guards prevent unrelated permissive Storage
policies from exposing this bucket. Other buckets are not restricted by them.
The migration fails if the managed `storage.objects` table has RLS disabled.

This migration grants no UPDATE policy. Use `upsert: false`; review pre-existing
Storage policies before relying on the absence of overwrite permissions.
Only the owner can request reads/signed URLs using their authenticated session.
Signed URLs are bearer links: anyone receiving a valid link can use it until
expiry. Use short expiry and never persist or log them.

Deleting rows does **not** delete Storage objects. The future repository/account
cleanup must coordinate image deletion through the Storage API (not SQL deletes
from `storage.objects`). Storage lifecycle, signed URL resolution and orphan
cleanup are not implemented in this milestone.

## Migration history and application reference

The project owner confirmed on 2026-11-12 that all three initial migrations were
successfully applied to hosted Supabase and the five tables/private bucket exist.
Do not reapply them to that project. No SQL or policies were changed for
Milestone 3. The following instructions are reference for a fresh/staging project.

1. Confirm you selected the intended SILVET project. Review/test on a disposable
   staging project first. These migrations expect new SILVET tables and
   PostgreSQL 15+ with standard Supabase Auth and Storage schemas/roles.
2. In **SQL Editor**, run these files in order, once:
   - `migrations/202611120001_silvet_foundation.sql`
   - `migrations/202611120002_clothing_metadata.sql`
   - `migrations/202611120003_private_wardrobe_images.sql`
   Each file is transactional. If it fails, stop and inspect; do not disable RLS
   or loosen policies to proceed. Do not repeatedly run a migration that succeeded.
3. Verify the five tables show RLS enabled. Inspect their policies/grants.
4. Under **Storage**, confirm `wardrobe-images` exists and is **not public**;
   inspect its MIME/size settings and all five `silvet_images_*` policies.
   Audit existing broad Storage policies as well.
5. If using Supabase CLI elsewhere: authenticate/link to the correct project and
   use its migration workflow (`supabase db push`) instead of manually applying
   files. Do not mix SQL Editor and CLI history without reconciling migration
   tracking. Local Supabase CLI/Docker is not required or used in this Replit.
6. Before live repository rollout, separately test two real authenticated users,
   anonymous requests, cross-user REST access and Storage upload/read/delete/
   signed-URL behavior against staging. Dashboard SQL Editor runs with elevated
   privileges and is **not** evidence that RLS protects end-user requests.

## Authentication dashboard configuration — manual

1. Under Supabase Auth providers, enable email/password signup and **Confirm email**.
   Match the password policy to the form's minimum of eight characters (stronger
   server requirements are still authoritative).
2. Configure Site URL and allow the exact `<approved-app-origin>/auth/callback`
   URL for development and, later, the actual published origin. Use a standalone
   app tab consistently: localStorage/PKCE are origin- and browser-specific.
   Do not substitute a preview parent origin or localhost for the user's actual
   origin. The app derives callback URLs from `window.location.origin`.
3. Configure a custom SMTP sender for general users. Supabase's default sender
   is restricted to project-team addresses with a very low hourly limit; it is
   not a production email service. Review confirmation expiry and resend limits.
4. In the signup confirmation email template, retain the confirmation link
   (`{{ .ConfirmationURL }}`) and include the email code (`{{ .Token }}`).
   Example body: `<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
   <p>Or enter this code in SILVET: {{ .Token }}</p>`.
   Disable email-link tracking that rewrites the URL.
5. Ensure the Data API exposes `profiles` to the authenticated role with the
   existing grants and owner RLS. Do not change RLS or add elevated credentials.
6. Google is disabled in the UI until public Auth settings report it enabled.
   A settings/network failure also leaves it unavailable; email auth remains
   usable. Reload the sign-in page after dashboard configuration changes.

### Google Cloud / Supabase provider

- Create/configure a Google OAuth Web application, consent branding, audience
  and test users if the OAuth app remains in testing.
- Add approved app JavaScript origins per Google's setup requirements.
- Set the Google authorized redirect URI to the callback shown in Supabase's
  Google-provider settings: `<supabase-project-origin>/auth/v1/callback`.
  This is NOT SILVET's `/auth/callback` URL.
- Enter the Google Client ID/Client Secret **only in Supabase's Google provider
  settings**, then enable it. Do not put that secret in Replit frontend variables.
- SILVET requests normal Google identity sign-in only, no Google API/offline access.
- Validate consent and redirects using an actual Google account before claiming
  hosted OAuth works. The implementation's browser tests intercept this flow.

### Session, verification and profile behavior

- Verified sessions are checked through Supabase `getUser`, not trusted solely
  from localStorage. Auth state changes and automatic refresh use the existing
  SDK; profile work runs separately from the SDK's auth-event callbacks.
- PKCE links need the browser/device where signup began. Email-code fallback
  supports confirmation in a different browser. Codes/links expire and are single-use.
  Starting overlapping PKCE flows may invalidate an earlier flow's verifier;
  use a fresh flow or email-code fallback if that happens.
- The check-email panel is reachable through **Verify your email** on either auth
  page, including after reload. Passwords/codes are not persisted by the UI.
- Profile provisioning occurs after verified authentication. Insert-on-conflict
  does nothing, then retrieves the existing row; login never resets preferences.
  Failures show retry/sign-out rather than fabricating a profile.
- Onboarding uses existing styles, optional name and optional selections. Skip
  writes only completion time, preserving all existing saved preference fields.
- Logout uses `scope: 'local'` (this browser, including its tabs), not every
  device. Account-specific profile cache is cleared; demo storage is not cleared.
  Revocation does not retroactively invalidate all previously issued access JWTs.
- Redirect continuations accept only known same-origin `/app` destinations.
- Password reset, account deletion/editing, full SupabaseRepository and image
  lifecycle remain outside this milestone.

No hosted auth accounts or emails are created by the mocked browser tests.
Real email delivery, verification, hosted profile provisioning/RLS and Google
consent must be verified separately with approved test accounts after setup.

## Verification

```sh
npm run check
npm run build
node scripts/test-supabase-security.mjs
node --experimental-websocket scripts/auth.browser.mjs
```

The last command requires local PostgreSQL 15+ tools (`initdb`, `pg_ctl`, `psql`).
It starts an isolated, temporary Unix-socket-only PostgreSQL cluster, applies all
three migrations and exercises real SQL RLS/grants/constraints using two synthetic
user identities and the anonymous role. It does not read project database URLs
or keys and cleans up the cluster afterward.

`tests/bootstrap.sql` provides minimal stand-ins for Supabase Auth/Storage roles,
tables and functions. **Never apply anything in `tests/` to a real project.**
The SQL tests prove PostgreSQL policy/data behavior, not the hosted Auth, REST,
Storage service, MIME enforcement, signed-URL or key-connectivity behavior.

The auth browser suite runs Chromium with a temporary browser profile, synthetic
identities and intercepted Supabase HTTP responses. It covers the real UI and SDK
protocol, not the hosted identity service. Run the existing Studio, Lookbook and
Ideas suites as regression checks too. No test account passwords or tokens belong
in tracked fixtures, logs or documentation; fixture credentials are synthetic.
