# SILVET M7 functional completion

## Authentication recovery

Password recovery uses Supabase Auth's PKCE recovery flow. Set the Supabase
Auth **Site URL** to the published SILVET origin and add the exact
`/auth/update-password` URL to **Redirect URLs** (also add the local Replit
preview origin used for testing). The reset email template must link to the
provided redirect destination. No migration or service-role key is needed.

The recovery page accepts only a PKCE callback reported by the Supabase client
as `recovery`, validates the resulting account session, and does not keep the
code in browser history. A normal sign-in code cannot authorize password
changes. Reloading or switching accounts invalidates the in-memory recovery
grant; request another reset link to continue.

## Wardrobe image processing

Supported images are decoded with orientation applied, resized proportionally,
and re-encoded as WebP. Re-encoding removes source EXIF/GPS metadata when the
browser supports the required image APIs. Thumbnails are limited to 400px on
their longest edge and uploaded separately only when the result is genuinely
smaller. There is no forced crop.

If decoding or WebP encoding fails, the original is retained as required and
uploaded unchanged. In that fallback case, source EXIF/GPS metadata may remain;
the UI discloses this limitation. Existing private Storage paths and RLS
policies are unchanged.

## Package installation and deployment

`package-lock.json` already resolves packages from `registry.npmjs.org`.
`.npmrc` selects the public registry explicitly so clean installs do not depend
on a Replit package mirror. No package dependencies or deployment target were
changed for M7.

The existing single Node VM deployment continues to serve the Vite build and
M6 API on one origin. Keep the existing Supabase URL/public-key settings and
do not add service-role credentials.

## Other changes

- Profile editing updates only the signed-in user's display name and style
  preferences; it does not change onboarding completion.
- Wardrobe filters and multi-term search are shareable in the URL.
- Saved style preferences add soft scoring only when the garment's actual
  `styleTags` match. They never exclude otherwise valid outfits.
- ScreenPlaceholder was unused and removed. The styleguide route is included
  only in development builds.
