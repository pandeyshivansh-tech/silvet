/** Real Chromium and SDK, synthetic Auth/DB/Storage only. Never contacts hosted data. */
import assert from "node:assert/strict";
import { createBrowserHarness, pause } from "./lib/browserHarness.mjs";
import { createAuthFixtures, accountA, accountB, profile, session } from "./lib/authFixtures.mjs";
import { createProductFixtures } from "./lib/productFixtures.mjs";
const h = await createBrowserHarness();
const data = createProductFixtures();
const objects = new Set();
let uploadFailure = false, signCount = 0;
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMZkAAAAASUVORK5CYII=";
const auth = createAuthFixtures(h.origin, { handleData: async (args) => {
  const { request, requestId, page, url, body, reply, failure, account } = args;
  if (!url.pathname.startsWith("/storage/v1/")) return data.handleData(args);
  if (request.method === "GET") {
    await page.send("Fetch.fulfillRequest", { requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "image/png" }, { name: "Access-Control-Allow-Origin", value: h.origin }],
      body: png });
    return true;
  }
  if (url.pathname.includes("/object/sign/")) {
    signCount++;
    assert(body.paths.every((path) => path.startsWith(`${account}/`)));
    await reply(body.paths.map((path) => ({ path, signedURL: `/object/sign/wardrobe-images/${path}?token=fixture-${signCount}`, error: null })));
  } else if (request.method === "DELETE") {
    for (const path of body.prefixes) { assert(path.startsWith(`${account}/`)); objects.delete(path); }
    await reply([]);
  } else {
    const path = url.pathname.split("/object/wardrobe-images/")[1];
    assert(path?.startsWith(`${account}/`));
    if (uploadFailure) await failure("denied", 403);
    else { objects.add(path); await reply({ Key: `wardrobe-images/${path}` }); }
  }
  return true;
} });
auth.rows.set(accountA, profile(accountA, true));
auth.rows.set(accountB, profile(accountB, true));
await auth.install(h.page);
const { evaluate, navigate, check, contains, click, fill, reload } = h;
async function open(path) {
  await evaluate(`history.pushState({},'',${JSON.stringify(path)});window.dispatchEvent(new PopStateEvent('popstate'))`);
  await pause(200);
}
async function photo(type = "image/png", size = 0) {
  await evaluate(`(() => {
    const bytes=Uint8Array.from(atob(${JSON.stringify(png)}),c=>c.charCodeAt(0));
    const file=new File([${size ? `new Uint8Array(${size})` : "bytes"}],'photo.png',{type:${JSON.stringify(type)}});
    const transfer=new DataTransfer();transfer.items.add(file);
    const el=document.querySelector('input[type=file]');el.files=transfer.files;
    el.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await pause(100);
}
try {
  await navigate("/auth/sign-in");
  await evaluate(`localStorage.setItem('silvet.auth.v1',JSON.stringify(${JSON.stringify(session())}))`);
  await navigate("/app/wardrobe/new");
  await check("Authenticated add form offers camera and file selection", "Boolean(document.querySelector('input[capture=environment]'))");
  await fill("Name", "Private photo kurta");
  await evaluate(`(() => { const el=document.querySelector('select[name=categorySlug]');el.value='tops';el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await photo("image/gif");
  await check("Unsupported formats are rejected before uploading", contains("Choose a JPEG, PNG or WebP"));
  await photo("image/png", 10485761);
  await check("Files above 10 MiB are rejected", contains("no larger than 10 MiB"));
  await photo();
  await check("Local image preview appears before saving", "Boolean(document.querySelector('img[src^=\"blob:\"]'))");
  uploadFailure = true;
  await click("Save piece");
  await check("Upload failure stays on the form with an error", contains("photo could not be uploaded"));
  assert.equal(data.wardrobe.size, 0);
  uploadFailure = false;
  await click("Save piece");
  await check("Saved garment displays a private signed image", "location.pathname.startsWith('/app/wardrobe/') && Boolean(document.querySelector('img[src*=\"/object/sign/\"]'))");
  const item = [...data.wardrobe.values()][0];
  const oldPath = item.image_path;
  assert(oldPath.startsWith(`${accountA}/`));
  assert.equal(objects.size, 1);
  await reload();
  await check("Photo survives a full reload", "Boolean(document.querySelector('img[src*=\"/object/sign/\"]'))");
  const focusedCount = signCount;
  await evaluate("document.querySelector('img[src*=\"/object/sign/\"]').dispatchEvent(new Event('error'))");
  await check("An unavailable image has a safe placeholder", "!document.querySelector('img[src*=\"/object/sign/\"]')");
  await evaluate("window.dispatchEvent(new Event('visibilitychange'))");
  await check("A fresh signed URL recovers a previously failed image", `Boolean(document.querySelector('img[src*="fixture-${focusedCount + 1}"]'))`);
  await open(`/app/wardrobe/${item.id}/edit`);
  await check("Edit form loads the existing private photo", "Boolean(document.querySelector('img[src*=\"/object/sign/\"]'))");
  await photo();
  data.state.failWrites = true;
  await click("Save changes");
  await check("Database failure keeps the replacement draft and reports failure", contains("could not be loaded or saved"));
  assert.equal(data.wardrobe.get(item.id).image_path, oldPath);
  assert(objects.has(oldPath));
  assert.equal(objects.size, 1);
  data.state.failWrites = false;
  await click("Save changes");
  await check("Replacement returns to saved detail", `location.pathname==='/app/wardrobe/${item.id}'`);
  assert(!objects.has(oldPath));
  assert.equal(objects.size, 1);
  assert.notEqual(data.wardrobe.get(item.id).image_path, oldPath);
  const before = signCount;
  await reload();
  await check("Reload resolves fresh signed URLs", "Boolean(document.querySelector('img[src*=\"/object/sign/\"]'))");
  assert(signCount > before);
  await open(`/app/wardrobe/${item.id}/edit`);
  await click("Remove photo"); await click("Save changes");
  await check("Removing a photo preserves the garment", `location.pathname==='/app/wardrobe/${item.id}'`);
  assert.equal(data.wardrobe.get(item.id).image_path, null);
  assert.equal(objects.size, 0);
  auth.state.account = accountB;
  await evaluate(`localStorage.setItem('silvet.auth.v1',JSON.stringify(${JSON.stringify(session(accountB))}))`);
  await navigate("/app/wardrobe");
  await check("Another account cannot see the previous account garment", `!${contains("Private photo kurta")} && !document.querySelector('img[src*="${accountA}"]')`);
  await navigate("/demo/wardrobe/new");
  await check("Demo still describes photos as preview only", contains("photos are not saved in this demo"));
  await photo();
  await check("Demo photo previews remain local", "Boolean(document.querySelector('img[src^=\"blob:\"]'))");
  assert.equal(objects.size, 0);
  assert.equal(h.errors.length, 0, JSON.stringify(h.errors));
  console.log(`PASS: ${h.checks.length} image browser checks (synthetic fixtures, not hosted).`);
} finally { await h.close(); }
