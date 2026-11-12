# SILVET Supabase — foundation, authentication and personal data

Milestone 4 connects the existing personal product screens to an account-bound
`SupabaseRepository`. `/demo/*` still uses `DemoRepository` and its session-only
behavior; no sample records are copied into accounts. Authentication/onboarding
and the minimal profile screen remain in place.

**Hosted status:** migrations 001–003 were reported applied by the project owner.
Migration 004 is supplied for review/manual application only. Local tests do not
prove hosted persistence. Do not rerun 001, 002 or 003 for this milestone.

## Milestone 4 — manual migration 004 review and application

The complete SQL is in `migrations/202611120004_atomic_save_outfit.sql`.
It adds only `public.silvet_save_outfit(_input jsonb, _id uuid default null)`,
its execution grant and comment. It does not alter tables, existing policies,
RLS settings, bucket settings or earlier migrations.

1. Open the correct SILVET project in the Supabase dashboard. Confirm the five
   existing tables and migrations 001–003 are already present. PostgreSQL 15+
   and the existing Supabase `auth.uid()`/roles are prerequisites.
2. In SQL Editor, create a new query and paste the **entire migration 004**,
   including `begin;` and `commit;`. Review it before running.
3. Run it once. If any statement fails, stop and inspect the error; do not weaken
   security or substitute service-role frontend access. A successful migration
   is not idempotent: do not rerun it or use CREATE OR REPLACE without review.
4. Run these read-only checks:

   ```sql
   select p.oid::regprocedure as signature,
          not p.prosecdef as security_invoker,
          p.proconfig as settings
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'silvet_save_outfit';

   select
     has_function_privilege('authenticated',
       'public.silvet_save_outfit(jsonb,uuid)', 'execute') as authenticated_can_execute,
     has_function_privilege('anon',
       'public.silvet_save_outfit(jsonb,uuid)', 'execute') as anon_can_execute;

   select pg_get_functiondef('public.silvet_save_outfit(jsonb,uuid)'::regprocedure);
   ```

   Expect `security_invoker = true`, an empty fixed search path, authenticated
   execution `true`, and anonymous execution `false`. Compare the function body
   to the reviewed file. Do not use SQL Editor's elevated access to infer user RLS.
5. If PostgREST temporarily reports the RPC missing, allow its schema cache to
   refresh and retry. Do not bypass the RPC with separate parent/piece writes.
6. Perform the two-account application checks below. No migration was applied
   by the implementation agent, and no hosted accounts were used for its tests.

Each RPC executes in one PostgreSQL transaction. It locks an existing outfit and
referenced live garments, validates owner/shape/slots/base/accessory rules, and
creates or replaces all pieces. Exceptions roll back the whole call. The local
SQL tests force a `23505` piece insertion failure **after** parent insertion or
replacement, checking that new rows disappear and old details/pieces are restored.
Null item IDs retain removed placeholders but do not count as selected garments.

### Types and application wiring

- No columns were added. The existing constraint-informed row types are retained.
  `Database.public.Functions.silvet_save_outfit` and the JSON argument type were
  added in `src/lib/supabase/database.types.ts`, derived from the reviewed SQL.
- No Supabase CLI project linkage or credentials are configured here. Optional
  official generation elsewhere, **after** applying 004:
  `supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > /tmp/silvet-schema.ts`.
  Compare it before replacing app types; retain the named row aliases consumed
  by the repository/profile service. This command was not run by the agent.
- Personal wardrobe, Studio and Lookbook reuse the same feature screens as demo.
  `/app/ideas` redirects to the existing `/app/style?mode=ideas` mode.
- All personal item/outfit/usage/image keys contain the user ID. Logout/account
  switches cancel/remove the previous account's queries; keyed product providers
  reset drafts. Repository operations reject stale account instances and late
  responses after an account change. RLS is still the access-control boundary.
- Ideas uses the first saved style preference initially; occasion defaults to
  everyday and season remains optional because the profile has no saved fields
  for those. Changing any Ideas filter does not write profile preferences.
- Existing public client variable names are unchanged; no new environment
  variables or privileged keys are required.

### Safe hosted two-account acceptance plan

Use two disposable, verified accounts in separate browser profiles. Do not share
passwords, OTPs, callback codes, session tokens or signed URLs in logs/chat.

1. Account A: complete or skip onboarding; confirm wardrobe/Lookbook are empty,
   with no demo seed records. Create a kurta, jeans and a saree without photos.
2. Edit a garment, refresh, sign out and sign back in. Verify details persist.
3. Build and save kurta + jeans and a one-piece saree look. Edit the saved look
   in Studio; confirm its ID stays unchanged and piece order is preserved.
4. In Ideas, verify a saved style preference is selected initially. Change
   occasion/style/season, generate a complete look and save it into Lookbook.
   Refresh Profile and confirm saved preferences were not overwritten.
5. Delete a referenced garment with confirmation. Open its saved outfit and
   verify a removed placeholder appears without a broken link. Replace it in
   Studio with a valid garment and save a complete outfit again.
6. Account B: wardrobe/Lookbook must start empty. Known A garment/outfit URLs
   must be unavailable; B must not edit or delete A's records. Add B's own
   lehenga and confirm it never appears in A's account.
7. In one SPA tab, sign out A and sign in B. Confirm no A names or previews appear,
   even briefly. Repeat with refresh/session restoration and a phone viewport.
8. Use DevTools offline mode to exercise failed reads/saves/deletes. Failure must
   never show success or erase the current draft. Restore connectivity and retry.
9. Visit `/demo/*` while signed in and signed out. Its existing sample records and
   tab-local changes must stay isolated from both accounts.

### Explicit limitations

- Hosted persistence, live RLS and cross-account REST behavior remain unverified
  until 004 is applied and actual accounts complete the acceptance plan.
- Images are not uploaded, processed, replaced, removed or signed. Existing image
  keys remain in row mappings, but image resolution returns unavailable so the
  existing no-photo illustrations render. A form photo is only a local preview.
  Deleting a wardrobe row does not clean up existing Storage objects.
- A lost HTTP response **after** server commit can leave the outcome uncertain.
  Check Lookbook before retrying a new save. In-tab duplicate submits are guarded;
  no distributed idempotency or concurrent-edit conflict UI is claimed.
- PostgreSQL transaction rollback was tested locally; hosted network recovery was
  not tested. Existing Google provider/email configuration remains unchanged.

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
They now include the migration 004 RPC contract; optional official generation is
described above. They are not represented as hosted schema introspection.

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
are checked by `checkOutfit()` and independently enforced at the atomic RPC trust
boundary in migration 004. Parity checks protect standalone outerwear and accessory
capacity from drifting. Migrations 001–003 alone are not the outfit-save API.

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
- Password reset, account deletion/editing and image lifecycle remain out of scope.

No hosted auth accounts or emails are created by the mocked browser tests.
Real email delivery, verification, hosted profile provisioning/RLS and Google
consent must be verified separately with approved test accounts after setup.

## Verification

```sh
npm run check
npm run build
node scripts/test-supabase-security.mjs
node --experimental-websocket scripts/auth.browser.mjs
node --experimental-websocket scripts/personal.browser.mjs
```

The SQL security command requires local PostgreSQL 15+ tools (`initdb`, `pg_ctl`, `psql`).
It starts an isolated, temporary Unix-socket-only PostgreSQL cluster, applies all
four migrations and exercises real SQL RLS/grants/constraints and atomic-save failures using two synthetic
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
