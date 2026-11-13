/**
 * Isolated Chromium Ideas regression journey, no added dependencies.
 * Run with Vite serving: node --experimental-websocket scripts/ideas.browser.mjs
 * Fixture and failure injection affect only this temporary browser profile.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const origin = process.env.SILVET_TEST_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
if (!origin) throw new Error("Set SILVET_TEST_URL to the running app URL.");
const profile = await mkdtemp(join(tmpdir(), "silvet-ideas-"));
const port = 19224;
const browser = spawn(process.env.CHROMIUM || "chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const pause = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const checks = [];
const errors = [];
const pending = new Map();
let socket;
let id = 0;
let pageLoads = 0;
try {
  let target;
  for (let i = 0; i < 40; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = pages.find((page) => page.type === "page");
      if (target) break;
    } catch { /* Chromium is starting. */ }
    await pause(200);
  }
  assert(target, "Chromium opened a page");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry?.reject(new Error(JSON.stringify(message.error)));
      else entry?.resolve(message.result);
    }
    if (message.method === "Page.loadEventFired") pageLoads++;
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async (expression) => {
    const output = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (output.exceptionDetails) throw new Error(JSON.stringify(output.exceptionDetails));
    return output.result.value;
  };
  const body = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const control = (text) => `(() => {
    const scope=document.querySelector('[role="alertdialog"],[role="dialog"]') || document;
    const nodes=[...scope.querySelectorAll('button,a')].filter(b=>b.getClientRects().length);
    return nodes.find(b=>b.getAttribute('aria-label')===${JSON.stringify(text)}) ||
      nodes.find(b=>b.textContent.trim()===${JSON.stringify(text)});
  })()`;
  const check = async (label, expression) => {
    for (let i = 0; i < 90; i++) {
      if (await evaluate(`(() => {try{return Boolean(${expression});}catch{return false;}})()`)) {
        checks.push(label);
        console.log("PASS:", label);
        return;
      }
      await pause(200);
    }
    console.error(await evaluate("JSON.stringify({url:location.href,body:document.body.innerText.slice(0,6000)})"));
    assert.fail(label);
  };
  const click = async (text) => {
    const point = await evaluate(`(() => {const b=${control(text)};if(!b || b.disabled)throw new Error('Missing/disabled: '+${JSON.stringify(text)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
    await pause(500);
  };
  const navigate = async (path) => {
    const previous = pageLoads;
    await send("Page.navigate", { url: `${origin}${path}` });
    for (let i = 0; i < 90 && pageLoads <= previous; i++) await pause(100);
    await pause(400);
  };
  const screenshot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const path = join(tmpdir(), `silvet-ideas-${name}.png`);
    await writeFile(path, Buffer.from(data, "base64"));
    console.log("SCREENSHOT:", path);
  };
  const fp = "document.querySelector('section[aria-label=\"Recommended outfit\"]')?.dataset.fingerprint";
  const repository = (code) => `(async()=>{const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');const repo=new DemoRepository();${code}})()`;
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/");
  await check("Existing landing loads", "Boolean(document.querySelector('a[href=\"/demo/wardrobe\"]'))");
  await evaluate(`(async()=>{
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    window.__itemsOriginal=DemoRepository.prototype.listItems;
    DemoRepository.prototype.listItems=async function(){await new Promise(r=>setTimeout(r,1200));throw new Error('Simulated item read failure');};
    history.pushState({},'', '/demo/style?mode=ideas');dispatchEvent(new PopStateEvent('popstate'));
  })()`);
  await check("Ideas uses Studio loading state", "Boolean(document.querySelector('.skeleton')) && !document.querySelector('section[aria-label=\"Recommended outfit\"]')");
  await check("Ideas repository error offers retry", `Boolean(${control("Try again")})`);
  await evaluate(`(async()=>{const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');DemoRepository.prototype.listItems=window.__itemsOriginal;})()`);
  await click("Try again");
  await check("Retry opens Ideas using repository garments", `${body("Find your next look")} && Boolean(${fp})`);
  await check("Occasion, style and season controls are accessible", "document.querySelectorAll('select').length===3 && [...document.querySelectorAll('select')].every(s=>document.querySelector('label[for=\"'+s.id+'\"]'))");
  const wardrobeBefore = await evaluate(repository("return await repo.listItems();"));
  const initialCount = await evaluate(repository("return (await repo.listOutfits()).length;"));
  await evaluate("(()=>{const s=document.querySelectorAll('select')[1];s.value='fusion';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await check("Optional fusion preference generates a complete idea", `${body("Why this works")} && Boolean(${fp}) && document.querySelector('section[aria-label="Recommended outfit"]')?.getAttribute("aria-busy")==="false"`);
  const firstFingerprint = await evaluate(fp);
  const structural = await evaluate(repository(`
    const {checkOutfit}=await import('/src/domain/outfitRules.ts');
    const {piecesFor}=await import('/src/engine/recommend.ts');
    const items=await repo.listItems(), ids=JSON.parse(${JSON.stringify(firstFingerprint)});
    return checkOutfit(piecesFor(items.filter(i=>ids.includes(i.id))),id=>items.find(i=>i.id===id));
  `));
  assert.equal(structural.valid && structural.complete, true);
  await screenshot("desktop");
  await evaluate(`(()=>{
    window.__setItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='silvet.demo.state.v1')throw new DOMException('Simulated full storage','QuotaExceededError');return window.__setItem.call(this,key,value);};
  })()`);
  await click("Save look");
  await check("Failed idea save stays visible with actionable error", `${body("This look could not be saved")} && ${fp}===${JSON.stringify(firstFingerprint)} && !${body("Your idea is saved in Lookbook.")}`);
  await evaluate("Storage.prototype.setItem=window.__setItem");
  assert.equal(await evaluate(repository("return (await repo.listOutfits()).length;")), initialCount);
  await evaluate(`(async()=>{
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    window.__saveOriginal=DemoRepository.prototype.saveOutfit;window.__saveCalls=0;
    DemoRepository.prototype.saveOutfit=async function(args){window.__saveCalls++;await new Promise(r=>setTimeout(r,800));return window.__saveOriginal.call(this,args);};
    const b=${control("Save look")};b.click();b.click();
  })()`);
  await check("Pending save prevents duplicate submissions", "Boolean([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Saving')&&b.disabled))");
  await check("Retry saves successfully with a detail link", `Boolean(${control("View saved look")}) && ${body("Look saved")}`);
  assert.equal(await evaluate("window.__saveCalls"), 1);
  const savedPath = await evaluate(`(${control("View saved look")}).getAttribute('href')`);
  const savedId = decodeURIComponent(savedPath.split("/").pop());
  const persisted = await evaluate(repository(`return await repo.getOutfit(${JSON.stringify(savedId)});`));
  assert.equal(persisted.source, "suggestion");
  assert.deepEqual(persisted.pieces.map((p) => p.itemId).sort(), JSON.parse(firstFingerprint));
  checks.push("Saved recommendation retains exact garments and suggestion source");
  assert.deepEqual(await evaluate(repository("return await repo.listItems();")), wardrobeBefore);
  checks.push("Ideas and saving do not mutate wardrobe metadata");
  await click("View saved look");
  await check("Ideas → Save → Lookbook detail shows all saved pieces", `location.pathname===${JSON.stringify(savedPath)} && ${body("The pieces")} && document.querySelectorAll('section[aria-label="Pieces in this look"] article').length===${persisted.pieces.length}`);
  await click("Lookbook");
  await check("Saved recommendation is present in the Lookbook grid", `Boolean(document.querySelector('a[href=${JSON.stringify(savedPath)}]'))`);
  await navigate("/demo/style?mode=ideas");
  await check("Returning to Ideas does not repeat the saved idea", `Boolean(${fp}) && ${fp}!==${JSON.stringify(firstFingerprint)}`);
  const beforeAnother = await evaluate(fp);
  await click("Another idea");
  await check("Another idea produces an unseen outfit", `Boolean(${fp}) && ${fp}!==${JSON.stringify(beforeAnother)} && ${fp}!==${JSON.stringify(firstFingerprint)}`);
  const beforeSwap = JSON.parse(await evaluate(fp));
  const labels = await evaluate("[...document.querySelectorAll('button[aria-label^=\"Swap \"]')].filter(b=>b.getClientRects().length).map(b=>b.getAttribute('aria-label'))");
  let swapped = false;
  for (const label of labels) {
    await click(label);
    if (await evaluate(fp) !== JSON.stringify(beforeSwap)) { swapped = true; break; }
  }
  assert(swapped, "At least one compatible swap exists in the seed wardrobe");
  const afterSwap = JSON.parse(await evaluate(fp));
  assert.equal(beforeSwap.filter((piece) => afterSwap.includes(piece)).length, beforeSwap.length - 1);
  checks.push("Swap changes exactly one garment and retains all other garments");
  await click("Open in Build");
  await check("Open in Build transfers an unsaved complete idea", `new URL(location.href).searchParams.get('mode')==='build' && ${body("Build a look")} && Boolean(${control("Save this look")}) && !(${control("Save this look")}).disabled`);
  const nameSelector = 'input[placeholder="e.g. Friday at the gallery"]';
  await evaluate(`(()=>{const field=document.querySelector(${JSON.stringify(nameSelector)});field.focus();field.select();})()`);
  await send("Input.insertText", { text: "Keep my unsaved draft" });
  await pause();
  await click("Ideas");
  await click("Build");
  await check("Switching modes preserves an unsaved Build draft", `document.querySelector(${JSON.stringify(nameSelector)}).value==='Keep my unsaved draft'`);
  await click("Ideas");
  await click("Open in Build");
  await check("Replacing an unsaved Build draft requires confirmation", body("Replace your unsaved Build draft?"));
  await click("Keep my draft");
  await click("Build");
  await check("Cancel replacement keeps the original Build draft", `document.querySelector(${JSON.stringify(nameSelector)}).value==='Keep my unsaved draft'`);
  await click("Ideas");
  await click("Open in Build");
  await click("Use this idea");
  await check("Confirmed handoff starts a fresh draft, not a saved edit", `document.querySelector(${JSON.stringify(nameSelector)}).value==='' && !new URL(location.href).searchParams.has('outfit') && !(${control("Save this look")}).disabled`);
  assert.equal(await evaluate(repository("return (await repo.listOutfits()).length;")), initialCount + 1);
  checks.push("Opening Build never saves or overwrites an existing outfit");
  await click("Save this look");
  await check("Transferred idea saves through existing Studio", "Boolean(new URL(location.href).searchParams.get('outfit'))");
  const builtId = await evaluate("new URL(location.href).searchParams.get('outfit')");
  assert.equal((await evaluate(repository(`return await repo.getOutfit(${JSON.stringify(builtId)});`))).source, "suggestion");
  checks.push("Studio preserves suggestion source after handoff and save");
  await click("Ideas");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("scrollTo(0,0)");
  await pause();
  await screenshot("mobile");
  for (const width of [360, 768, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await check(`Ideas fits ${width}px without horizontal overflow`, "document.documentElement.scrollWidth<=innerWidth");
  }
  await evaluate(repository(`
    for(const outfit of await repo.listOutfits())await repo.deleteOutfit(outfit.id);
    for(const item of await repo.listItems())await repo.deleteItem(item.id);
    await repo.createItem({input:{name:'Single test set',categorySlug:'one-piece',subcategorySlug:'kurta-sets'}});
  `));
  await navigate("/demo/style?mode=ideas");
  await check("Minimal wardrobe still produces a valid one-piece idea", `${body("Single test set")} && Boolean(${fp})`);
  const single = await evaluate(fp);
  await click("Swap Single test set");
  await check("Unavailable swap is explained and leaves outfit unchanged", `${body("No unseen compatible replacement")} && ${fp}===${JSON.stringify(single)}`);
  await click("Another idea");
  await check("Exhaustion is explicit instead of repeating", `${body("You’ve seen these ideas")} && !${fp}`);
  await navigate("/demo/style?mode=ideas");
  await check("Seen history prevents repeats across reload", body("You’ve seen these ideas"));
  await click("Restart ideas");
  await check("Explicit restart permits a new session of ideas", `${fp}===${JSON.stringify(single)}`);
  await evaluate(repository(`
    for(const item of await repo.listItems())await repo.deleteItem(item.id);
    await repo.createItem({input:{name:'Only jeans',categorySlug:'bottoms',subcategorySlug:'jeans'}});
  `));
  await navigate("/demo/style?mode=ideas");
  await check("Incomplete wardrobe gives specific missing-category guidance", `${body("Add a top")} && !${fp} && !${control("Save look")}`);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ result: "passed", checks: checks.length, browserErrors: errors }, null, 2));
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await pause(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
