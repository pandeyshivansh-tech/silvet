# M6: Product URL import

## Production and development architecture

Replit's official deployment documentation confirms both Reserved VM and Autoscale
support Node servers serving React assets and APIs. Static deployments do not:
https://docs.replit.com/features/publishing/deployment-types

The current Reserved VM target is preserved. Build with `npm run build`, which
creates the frontend in `dist/` and backend in `dist-server/`; run with `npm start`.
One Node process binds `0.0.0.0:$PORT` (default 5000) and serves both the SPA and
`/api/product-import/extract` and `/api/product-import/image`. The health endpoint
is `/api/health`. API errors never fall through to SPA HTML.

Development keeps `npm run dev`: a Vite middleware mounts the same API handler,
so browser requests are relative `/api/...` in both environments. There is no
hardcoded localhost or separate production API hostname in browser code.

The intended production domain was confirmed through deployment metadata as
`https://silvet.replit.app`. Local verification is not a production rollout.
An explicit republish is required to activate the new server on that domain.

### Environment

- `VITE_SUPABASE_URL`: existing Supabase project origin, required at build/runtime.
- `VITE_SUPABASE_ANON_KEY`: existing modern public `sb_publishable` key (or legacy
  anon key), required at build/runtime. Elevated keys are rejected.
- `PORT`: provided by hosting; falls back to 5000. No client API-base variable.

No hosted migration, new bucket, policy change, scraping service, separate server
deployment or paid API is required. The existing Supabase project and M5 Storage
ownership model are reused. Supabase Auth site/redirect settings must continue
to allow the production origin as required by the existing authentication setup.

## Security

- Every extraction/image request requires a bearer access token verified against
  the configured Supabase project's `/auth/v1/user` endpoint, plus a verified
  email. Decoding a JWT is not considered verification. No service-role key.
- Only HTTP(S), normal ports (80/443), no embedded credentials. Loopback, private,
  link-local, multicast, reserved, metadata and IPv6 transition/mapped ranges are
  denied. IPv6 is limited to public unicast global addresses.
- DNS resolution checks **all** answers. A mixed public/private answer fails.
  The Node connection's lookup is pinned to a checked IP, while preserving the
  requested hostname and normal TLS certificate/SNI verification. Connections
  are not pooled. This closes the validation-versus-connect DNS rebinding gap.
- Each of at most four redirects repeats URL and DNS validation, including a
  redirect to the same hostname. No bearer tokens, cookies or retailer account
  credentials are forwarded to retailers.
- One 12-second download deadline includes DNS, redirects and the response body.
  Incoming requests have a 20-second handler deadline, small JSON bodies (8 KiB),
  bounded headers and Node request/header timeouts.
- HTML is limited to 2 MiB; product images to 10 MiB. Limits apply to streamed
  bytes even without Content-Length. Non-HTML pages and non-JPEG/PNG/WebP images
  are rejected before body consumption. Unexpected compression is rejected,
  rather than decompressing unbounded data.
- Image signatures must match the declared MIME type. The browser must also
  successfully decode a downloaded image before it becomes the selected photo.
- HTML is parsed with parse5, JSON-LD with JSON.parse; neither executes scripts.
  Traversal and extracted field lengths are bounded. All displayed values use
  ordinary escaped React text, never raw HTML.
- Browser API requests are same-origin. Cross-origin browser requests are denied;
  no permissive CORS headers or cookie-based API authentication are enabled.
- Responses use no-store; binary images use nosniff and attachment disposition.
  Tokens, product URLs, page contents and callback/auth data are not logged.
- Caps: 16 concurrent token verifications, 8 active authenticated imports per
  process, 2 per account, 30 extraction/image requests per account per minute,
  and a bounded account limiter map. Limits are in-process, not distributed;
  restarting or scaling to multiple instances resets/multiplies them.

## Preview and persistence

Authenticated Add a piece offers **Import from URL**. Extraction returns a
transient preview. Schema.org Product JSON-LD is preferred, followed by Open
Graph/Twitter metadata. Title, image, brand, description, source URL and optional
price are shown when supplied. Category suggestions require explicit metadata
matching the existing clothing taxonomy; colours/style/occasion are not guessed.

The image endpoint downloads the selected image into a temporary local File.
No database row or Storage upload occurs before the user chooses **Save piece**.
The existing M5 form and SupabaseRepository then validate and upload it into the
private user/item-scoped bucket and persist keys. Permanent external hotlinking
is not used. Manual photo selection can replace the imported image. Failure to
download/decode an image leaves manual upload or no-image saving available.

Brand, retailer description, source URL and price are preview/reference fields,
not new persisted wardrobe fields; the existing schema is unchanged. Save
persists only existing editable garment metadata and M5 image references.
DemoRepository is untouched; demo Add a piece does not call import APIs.

M5's non-atomic Storage/database limitations still apply: uncertain writes and
failed cleanup can leave private orphans. No stronger recovery guarantee is made.

## Retailer limitations

No fixed retailer allowlist or claim of universal retailer compatibility.
Only publicly accessible, server-rendered structured metadata is supported.
Login walls, 401/403/429, CAPTCHA/bot protection, client-rendered-only product
metadata, pages above the size limit, unsupported encodings or images, and
missing metadata may require manual entry. No access restrictions are bypassed.
Robots/CAPTCHA circumvention, browser automation and third-party scraping APIs
are not implemented.

## Automated verification

```sh
npm run check
npm run build
node scripts/production.smoke.mjs
node --experimental-websocket scripts/import.browser.mjs
node --experimental-websocket scripts/images.browser.mjs
node --experimental-websocket scripts/personal.browser.mjs
node --experimental-websocket scripts/auth.browser.mjs
node --experimental-websocket scripts/studio.browser.mjs
node --experimental-websocket scripts/lookbook.browser.mjs
node --experimental-websocket scripts/ideas.browser.mjs
```

Run browser suites sharing the common harness sequentially (same Chromium port).
Tests use synthetic accounts and intercepted Auth/DB/Storage/API traffic.
Node tests exercise actual HTTP handlers with injected retailer responses,
DNS/transport mocks, and the actual transport's pinned lookup/streaming limits.
Production smoke starts the compiled Node server on port 5102 and checks static
routes, assets, API protection and PORT behavior without hosted requests.

These do not prove live retailer compatibility, real hosted account persistence
or the behavior of a new published revision. No hosted test accounts are created.

## Manual acceptance after explicit republish

1. Confirm publishing uses Reserved VM, build `npm run build`, run `npm start`,
   both existing public Supabase variables available at build and runtime.
2. Open `https://silvet.replit.app/api/health`: expect `{"ok":true}`. Reload a
   nested demo/auth route directly and confirm SPA/assets load. Confirm an
   unauthenticated POST to `/api/product-import/extract` returns JSON 401.
3. Sign in with an approved verified account. At `/app/wardrobe/new`, choose
   **Import from URL** and paste a publicly accessible fashion product URL.
   Inspect Network: API calls must use the published origin, never localhost.
4. Confirm preview fields come from the page, unknown fields remain empty, and
   no wardrobe row or Storage object exists until confirmation. Edit the title,
   category, colour and tags, then save. Reload and verify the private image.
5. Test an unsupported/login-protected retailer, missing metadata, an invalid
   image, and manual-entry fallback. Test a public HTTP product URL as well as
   HTTPS where the retailer permits it.
6. Test invalid/private targets (`http://127.0.0.1`,
   `http://169.254.169.254`) while signed in: expect a safe error and no import.
   Redirect and rebinding tests should use controlled fixtures, not real
   infrastructure probes.
7. Cancel a pending import; late results must not re-open a preview or save.
   Remove/change the imported image and verify the existing M5 behavior.
8. Sign out and switch accounts; no imported draft, clothing or image from the
   previous account may appear. Test phone camera/gallery fallback as in M5.
9. Visit `/demo/wardrobe/new`: existing manual entry and local-only previews
   should work unchanged without a product-import option.
