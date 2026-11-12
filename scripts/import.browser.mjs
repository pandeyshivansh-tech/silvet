/** Real Chromium + UI + SDK; all Auth, DB, Storage and retailer/API responses are synthetic. */
import assert from "node:assert/strict";
import { createBrowserHarness, pause } from "./lib/browserHarness.mjs";
import { createAuthFixtures, accountA, accountB, profile, session } from "./lib/authFixtures.mjs";
import { createProductFixtures } from "./lib/productFixtures.mjs";
const h = await createBrowserHarness();
const data = createProductFixtures();
const objects = new Set();
const png = await h.evaluate(`(() => { const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
  canvas.getContext('2d').fillRect(0,0,2,2);return canvas.toDataURL('image/png').split(',')[1]; })()`);
const state = { failure: "", imageFailure: false, delay: 0, extracts: 0, images: 0, missingCategory: false, expectedCancellation: false };
const result = () => ({ title: "Imported indigo kurta", brand: "Fixture Atelier", description: "Retailer description",
  productUrl: "https://retailer.com/products/kurta", imageUrl: "https://cdn.retailer.com/photo.png", categorySlug: state.missingCategory ? null : "tops",
  subcategorySlug: state.missingCategory ? null : "kurtas", price: "1200" });
const auth = createAuthFixtures(h.origin, {
  extraPatterns: [`${h.origin}/api/product-import/*`],
  handleData: async (args) => {
    const { request, requestId, page, url, body, reply, failure, account } = args;
    const imageReply = () => page.send("Fetch.fulfillRequest", { requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "image/png" }, { name: "Access-Control-Allow-Origin", value: h.origin }], body: png });
    if (url.pathname.startsWith("/api/product-import/")) {
      assert(Object.entries(request.headers).some(([key, value]) => key.toLowerCase() === "authorization" && value.startsWith("Bearer ")));
      assert.equal(new URL(request.url).origin, h.origin, "API uses the application origin, never localhost");
      if (url.pathname.endsWith("/extract")) {
        state.extracts++;
        if (state.delay) await pause(state.delay);
        try {
          if (state.failure) await reply({ code: "unsupported_retailer", message: state.failure }, 400);
          else await reply(result());
        } catch (error) {
          // CDP cannot fulfill a request whose AbortController already cancelled it.
          if (!state.expectedCancellation) throw error;
        }
      } else {
        state.images++;
        if (state.imageFailure) await reply({ code: "invalid_image", message: "Image unavailable" }, 400);
        else await imageReply();
      }
      return true;
    }
    if (!url.pathname.startsWith("/storage/v1/")) return data.handleData(args);
    if (request.method === "GET") { await imageReply(); return true; }
    if (url.pathname.includes("/object/sign/")) {
      assert(body.paths.every((path) => path.startsWith(`${account}/`)));
      await reply(body.paths.map((path) => ({ path, signedURL: `/object/sign/wardrobe-images/${path}?token=fixture`, error: null })));
    } else if (request.method === "DELETE") {
      for (const path of body.prefixes) objects.delete(path);
      await reply([]);
    } else {
      const path = url.pathname.split("/object/wardrobe-images/")[1];
      assert(path.startsWith(`${account}/`)); objects.add(path); await reply({ Key: path });
    }
    return true;
  },
});
auth.rows.set(accountA, profile(accountA, true));
auth.rows.set(accountB, profile(accountB, true));
await auth.install(h.page);
const { check, contains, click, fill, evaluate, navigate, reload } = h;
async function start() { await navigate("/app/wardrobe/new"); await click("Import from URL"); }
try {
  await navigate("/auth/sign-in");
  await evaluate(`localStorage.setItem('silvet.auth.v1',${JSON.stringify(JSON.stringify(session(accountA)))})`);
  await start();
  await fill("Product URL", "file:///etc/passwd"); await click("Preview product");
  await check("Invalid protocols are rejected locally", contains("valid HTTP or HTTPS"));
  assert.equal(state.extracts, 0);
  state.failure = "This retailer restricts automated access. Please use manual entry.";
  await fill("Product URL", "https://retailer.com/product"); await click("Preview product");
  await check("Unsupported retailer explains manual fallback", contains(state.failure));
  state.failure = "Private, internal and metadata URLs cannot be imported.";
  await fill("Product URL", "http://127.0.0.1"); await click("Preview product");
  await check("Blocked URL errors stay visible without creating a wardrobe record", contains(state.failure));
  assert.equal(data.wardrobe.size, 0);
  state.failure = "The retailer took too long to respond. Try manual entry.";
  await fill("Product URL", "https://retailer.com/product"); await click("Preview product");
  await check("Timeout errors offer manual entry", contains(state.failure));
  await click("Enter details manually");
  await check("Manual wardrobe creation remains available", "Boolean(document.querySelector('input[name=name]'))");
  state.failure = ""; state.delay = 300;
  await click("Import from URL"); await fill("Product URL", "https://retailer.com/product");
  const before = state.extracts;
  await evaluate("document.querySelector('form').requestSubmit();document.querySelector('form').requestSubmit()");
  await check("Processing disables duplicate submissions", "[...document.querySelectorAll('button')].some(b=>b.disabled && b.textContent.includes('Importing'))");
  await check("Imported preview includes title and brand", `${contains("Review imported product")} && ${contains("Fixture Atelier")}`);
  assert.equal(state.extracts, before + 1);
  state.delay = 0;
  assert.equal(data.wardrobe.size, 0); assert.equal(objects.size, 0);
  await check("Extracted garment values are editable and colours are not invented", "document.querySelector('input[name=name]').value==='Imported indigo kurta' && document.querySelector('select[name=categorySlug]').value==='tops' && document.querySelector('select[name=primaryColor]').value===''");
  await check("Product image is a downloaded local preview", "Boolean(document.querySelector('img[src^=\"blob:\"]'))");
  for (const width of [360, 768, 1280]) {
    await h.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await check(`Import preview fits ${width}px`, "document.documentElement.scrollWidth <= innerWidth");
  }
  await fill("Name", "My edited imported kurta");
  data.state.failWrites = true; await click("Save piece");
  await check("Failed wardrobe save retains the import draft", `${contains("could not be loaded or saved")} && Boolean(document.querySelector('img[src^="blob:"]'))`);
  assert.equal(objects.size, 0);
  data.state.failWrites = false; await click("Save piece");
  await check("Explicit confirmation saves through the existing repository", "location.pathname.match(/^\\/app\\/wardrobe\\/[\\w-]+$/) && document.body.innerText.includes('My edited imported kurta')");
  const saved = [...data.wardrobe.values()][0];
  assert(saved.image_path.startsWith(`${accountA}/${saved.id}/`)); assert.equal(objects.size, 1);
  assert(!saved.image_path.startsWith("https:"));
  await reload(); await check("Imported image survives reload as a private signed image", "Boolean(document.querySelector('img[src*=\"/object/sign/\"]'))");
  await start(); await fill("Product URL", "https://retailer.com/product");
  state.imageFailure = true; state.missingCategory = true;
  await click("Preview product");
  await check("Unavailable image offers manual upload or no-image save", contains("image could not be imported"));
  await check("Missing category stays blank for manual completion", "document.querySelector('select[name=categorySlug]').value===''");
  await fill("Name", "Imported without photo");
  await evaluate(`(() => { const el=document.querySelector('select[name=categorySlug]');el.value='tops';el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await click("Save piece");
  await check("Missing image and category can be completed manually and saved without a photo", `${contains("Imported without photo")} && /\\/app\\/wardrobe\\/[\\w-]+$/.test(location.pathname)`);
  assert.equal([...data.wardrobe.values()].find((row) => row.name === "Imported without photo").image_path, null);
  assert.equal(objects.size, 1);
  await start(); await fill("Product URL", "https://retailer.com/product"); await click("Preview product");
  await check("Another product remains an unsaved preview until confirmation", contains("Review imported product"));
  await click("Cancel import");
  await check("Cancelling resets the import without saving", "document.querySelector('input[name=name]').value===''");
  assert.equal(data.wardrobe.size, 2);
  await click("Import from URL"); await fill("Product URL", "https://retailer.com/product");
  state.delay = 400;
  await click("Preview product"); state.expectedCancellation = true; await click("Cancel import");
  await pause(600);
  state.expectedCancellation = false;
  await check("Cancelled extraction cannot reopen a late preview", `!${contains("Review imported product")} && Boolean(document.querySelector('input[name=name]'))`);
  auth.state.account = accountB;
  await evaluate(`localStorage.setItem('silvet.auth.v1',${JSON.stringify(JSON.stringify(session(accountB)))})`);
  await navigate("/app/wardrobe");
  await check("Account switching does not expose imported garments", `!${contains("My edited imported kurta")}`);
  await navigate("/demo/wardrobe/new");
  await check("Demo remains manual and independent from product imports", `!${contains("Import from URL")} && ${contains("photos are not saved in this demo")}`);
  assert.equal(h.errors.length, 0, JSON.stringify(h.errors));
  console.log(`PASS: ${h.checks.length} product-import browser checks (synthetic fixtures, not hosted).`);
} finally { await h.close(); }
