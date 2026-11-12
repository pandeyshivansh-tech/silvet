/**
 * Real Chromium + actual Supabase SDK against SYNTHETIC HTTP fixtures.
 * No hosted requests/writes. SQL security and rollback are tested separately.
 */
import assert from "node:assert/strict";
import { createBrowserHarness, pause } from "./lib/browserHarness.mjs";
import { createAuthFixtures, accountA, accountB, profile, session } from "./lib/authFixtures.mjs";
import { createProductFixtures } from "./lib/productFixtures.mjs";
const h = await createBrowserHarness();
const data = createProductFixtures();
const auth = createAuthFixtures(h.origin, { handleData: data.handleData });
for (const id of [accountA, accountB]) auth.rows.set(id, { ...profile(id), style_preferences: ["fusion"], onboarding_completed_at: new Date().toISOString() });
await auth.install(h.page);
const { check, contains, click, fill, navigate, reload, evaluate } = h;
const select = async (name, value) => evaluate(`(() => {
  const el=document.querySelector('select[name=${JSON.stringify(name)}]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});
  el.dispatchEvent(new Event('change',{bubbles:true}));
})()`);
async function open(path) {
  await evaluate(`history.pushState({},'',${JSON.stringify(path)});window.dispatchEvent(new PopStateEvent('popstate'))`);
  await pause(150);
}
async function deleteLook() {
  await click("Delete look");
  await check("Delete confirmation is available", "Boolean(document.querySelector('[role=\"alertdialog\"]'))");
  await evaluate(`(() => {const b=[...document.querySelectorAll('[role="alertdialog"] button')].find(b=>b.textContent.trim()==='Delete look');b.click()})()`);
  await pause(100);
}
async function add(name, category, type) {
  await open("/app/wardrobe/new");
  await fill("Name", name); await select("categorySlug", category); await pause(60); await select("subcategorySlug", type);
  if (name === "Personal saree") {
    data.state.delay = 150;
    await evaluate("document.querySelector('form').requestSubmit();document.querySelector('form').requestSubmit()");
  } else await click("Save piece");
  await check(`${name} saved to personal data`, `${contains(name)} && /\\/app\\/wardrobe\\/[\\w-]+$/.test(location.pathname)`);
  data.state.delay = 0;
}
try {
  await navigate("/auth/sign-in");
  await evaluate(`localStorage.setItem('silvet.auth.v1',${JSON.stringify(JSON.stringify(session(accountA)))})`);
  await navigate("/app/wardrobe");
  await check("A new account has an empty wardrobe, not demo clothing", `${contains("A wardrobe begins with one.")} && !${contains("Demo wardrobe")}`);
  await add("Personal kurta", "tops", "kurtas");
  const kurta = [...data.wardrobe.values()][0];
  await open(`/app/wardrobe/${kurta.id}/edit`); await fill("Name", "Personal cotton kurta"); await click("Save changes");
  await check("Item metadata updates persist", contains("Personal cotton kurta"));
  await add("Personal jeans", "bottoms", "jeans");
  await add("Personal saree", "one-piece", "sarees");
  const saree = [...data.wardrobe.values()].find((i) => i.name === "Personal saree");
  await reload(); await check("Reload reads the saved personal garment", contains("Personal saree"));
  assert.equal(data.counts.creates, 3);
  console.log("PASS: Repeated wardrobe submissions created only one record");

  await open("/app/ideas");
  await check("Ideas route opens the existing engine with personal garments", contains("Find your next look"));
  await check("Saved preferences gently boost Ideas without forcing the filter", "[...document.querySelectorAll('select')].some(s=>s.value==='') && document.body.innerText.includes('All saved style preferences gently boost matching garment tags')");
  await check("Personal Ideas never claims to be the demo", `!${contains("Demo pieces, saved looks")} && !${contains("Demo wardrobe")}`);
  await click("Save look");
  await check("Ideas saves a personal recommendation through the real repository", contains("View saved look"));
  const idea = [...data.outfits.values()][0];
  assert.equal(idea.source, "suggestion");
  await click("View saved look");
  await check("The personal recommendation opens in Lookbook", "location.pathname.startsWith('/app/lookbook/')");
  await deleteLook();
  await check("Deleting a personal recommendation leaves the wardrobe intact", "location.pathname==='/app/lookbook'");
  assert.equal(data.wardrobe.size, 3); assert.equal(data.outfits.size, 0);
  await open("/app/ideas");
  await check("Returning to Ideas keeps filters optional while scoring saved preferences", "[...document.querySelectorAll('select')].some(s=>s.value==='') && document.body.innerText.includes('All saved style preferences gently boost matching garment tags')");
  await evaluate(`(() => {const s=[...document.querySelectorAll('select')].find(s=>s.value==='');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'casual');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await check("Ideas selections can change independently of profile preferences", "[...document.querySelectorAll('select')].some(s=>s.value==='casual')");
  assert.deepEqual(auth.rows.get(accountA).style_preferences, ["fusion"]);
  // One-piece construction is sufficient on its own and exercises the Indian domain.
  await open("/app/style");
  await click("One-piece / set");
  await evaluate(`(() => {const label=[...document.querySelectorAll('p')].find(p=>p.textContent==='One-piece / set');label.parentElement.parentElement.querySelector('button').click()})()`);
  await click("Personal saree");
  await fill("Name this look", "Personal festive look");
  data.state.failSave = true; await click("Save this look");
  await check("Failed atomic save shows failure without success navigation", `${contains("could not be saved")} && location.pathname==='/app/style'`);
  assert.equal(data.outfits.size, 0);
  data.state.failSave = false; await click("Save this look");
  await check("Studio saves through the atomic RPC", "location.pathname==='/app/style' && new URLSearchParams(location.search).has('outfit')");
  assert.equal(data.counts.saves, 2);
  const saved = [...data.outfits.values()][0];
  await open(`/app/lookbook/${saved.id}`);
  await reload(); await check("Saved outfit detail restores its real garment after reload", `${contains("Personal festive look")} && ${contains("Personal saree")}`);
  await open(`/app/style?outfit=${saved.id}`);
  await fill("Name this look", "Edited personal look"); await click("Save changes");
  await check("An existing outfit edits in place", `document.querySelector('input[placeholder="e.g. Friday at the gallery"]').value==='Edited personal look' && ${contains("Your look is updated.")}`);
  assert.equal(data.outfits.size, 1);

  await open(`/app/wardrobe/${saree.id}`);
  await check("Usage count is refreshed after saving an outfit", `${contains("saved look")} || ${contains("outfit")}`);
  await click("Delete"); await click("Remove piece");
  await check("Confirmed wardrobe deletion returns to personal wardrobe", "location.pathname==='/app/wardrobe'");
  await open(`/app/lookbook/${saved.id}`);
  await check("Deleted garments render as removed placeholders", contains("No longer in your wardrobe"));
  assert([...data.pieces.values()].some((p) => p.outfit_id === saved.id && p.item_id === null));
  data.state.failDelete = true;
  await deleteLook();
  await check("Failed delete leaves the saved outfit available", contains("could not be loaded or saved"));
  assert.equal(data.outfits.size, 1);
  data.state.failDelete = false; await click("Retry delete");
  await check("Successful confirmed delete removes the saved outfit", "location.pathname==='/app/lookbook'");
  assert.equal(data.outfits.size, 0);

  await open("/app/profile"); await click("Sign out");
  await check("Logout protects personal routes", "location.pathname==='/auth/sign-in' || location.pathname==='/'");
  auth.state.account = accountB;
  await open("/auth/sign-in"); await fill("Email address", "fixture-b@example.com"); await fill("Password", "synthetic-password"); await click("Sign in");
  await check("Account B login finishes before app navigation", "location.pathname==='/app/profile' && document.body.innerText.includes('Personal wardrobe')");
  await open("/app/wardrobe");
  await check("Account B never sees A's wardrobe after SPA account switching", `${contains("A wardrobe begins with one.")} && !${contains("Personal cotton kurta")} && !${contains("Personal jeans")}`);
  await open(`/app/wardrobe/${kurta.id}`);
  await check("Another account's garment URL is unavailable", contains("This piece isn't in the wardrobe."));
  await add("Account B lehenga", "one-piece", "lehenga-sets");
  await open("/app/wardrobe");
  await check("Account B sees only its own clothing", `${contains("Account B lehenga")} && !${contains("Personal jeans")}`);
  data.state.failReads = true;
  await open("/app/lookbook");
  await check("Personal data read failures have an honest error state", contains("Your looks didn’t load."));
  data.state.failReads = false; await click("Try again");
  await check("A failed personal read can be retried", contains("Your first look starts here."));
  await h.page.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 900, deviceScaleFactor: 1, mobile: false });
  await open("/app/wardrobe");
  await check("Personal wardrobe fits a phone without horizontal overflow", "document.documentElement.scrollWidth<=innerWidth");
  await open("/demo/wardrobe");
  await check("Demo still uses its own sample data while signed in", `${contains("Demo wardrobe")} && !${contains("Account B lehenga")} && !${contains("Personal cotton kurta")}`);
  assert.deepEqual(auth.rows.get(accountA).style_preferences, ["fusion"]);
  assert.deepEqual(h.errors, []);
  console.log(`PASS: ${h.checks.length} personal-data browser checks (synthetic HTTP fixtures; not hosted verification).`);
} catch (error) {
  console.error(await evaluate("document.body.innerText.slice(0,4000)"));
  throw error;
} finally { await h.close(); }
