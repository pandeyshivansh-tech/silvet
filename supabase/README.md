# SILVET Supabase foundation — Milestone 2

This directory is a foundation, not a live-data switch. `DemoLayout` still creates
`DemoRepository`; auth remains signed out/unconfigured. No auth screens, profile
flows or `SupabaseRepository` are implemented here.

## Public client configuration

- `VITE_SUPABASE_URL`: the HTTPS project origin.
- `VITE_SUPABASE_ANON_KEY`: the modern **`sb_publishable_…`** key. The legacy
  variable name is retained. Legacy public `anon` JWTs also pass shape validation.
- Never use `sb_secret_…` or a legacy `service_role` key in any `VITE_` variable.
  These values become public browser code, even when entered through Secrets.
- Vite validates any supplied configuration before serving/building to prevent
  embedding an elevated key. Both variables can be absent for a demo-only setup.
- `getSupabaseClient()` is lazy. Nothing in the running demo imports/calls it.
  It creates a typed singleton only when future integration explicitly asks for
  it. It uses PKCE, isolated session storage key `silvet.auth.v1`, and SDK-managed
  user JWT headers. URL callback handling is deliberately disabled until auth work.
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

## Apply to your Supabase project — manual, not performed here

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

No dashboard schema changes, auth users, storage objects or bucket have been
created remotely by this milestone. Auth provider setup, redirect URLs, onboarding,
profile provisioning and switching data repositories belong to later milestones.

## Verification

```sh
npm run check
npm run build
node scripts/test-supabase-security.mjs
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
