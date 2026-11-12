/**
 * Real-browser Lookbook regression journey, without added dependencies.
 * Run: node --experimental-websocket scripts/lookbook.browser.mjs
 * Requires Chromium and the running dev server. Optional SILVET_TEST_URL override.
 * Fixtures/failure injection run ONLY in an isolated temporary browser session.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const origin = process.env.SILVET_TEST_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
if (!origin) throw new Error("Set SILVET_TEST_URL to the running app URL.");
const profile = await mkdtemp(join(tmpdir(), "silvet-lookbook-"));
const port = 19223;
const browser = spawn(process.env.CHROMIUM || "chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const pause = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let nextId = 0;
let pageLoads = 0;
const pending = new Map();
const errors = [];
const checks = [];

try {
  let target;
  for (let tries = 0; tries < 40; tries++) {
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
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler?.reject(new Error(JSON.stringify(message.error)));
      else handler?.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    if (message.method === "Page.loadEventFired") pageLoads++;
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(message.params.args.map((arg) => arg.value ?? arg.description));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const control = (text) => `(() => {
    const text=${JSON.stringify(text)};
    const scope=document.querySelector('[role="alertdialog"],[role="dialog"]') || document;
    const controls=[...scope.querySelectorAll('a,button')].filter(b=>b.getClientRects().length);
    return controls.find(b=>b.getAttribute('aria-label')===text) ||
      controls.find(b=>b.textContent.trim()===text) ||
      controls.find(b=>b.textContent.includes(text));
  })()`;
  const click = async (text) => {
    for (let tries = 0; tries < 60; tries++) {
      if (await evaluate(`Boolean(${control(text)}) && !(${control(text)})?.disabled`)) break;
      await pause(200);
    }
    const point = await evaluate(`(() => {
      const b=${control(text)};
      if(!b || b.disabled) throw new Error('Missing or disabled control: '+${JSON.stringify(text)});
      b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
    await pause();
  };
  const check = async (label, expression) => {
    let passed = false;
    for (let tries = 0; tries < 80; tries++) {
      if (await evaluate(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) {
        passed = true;
        break;
      }
      await pause(200);
    }
    if (!passed) {
      console.error(await evaluate("JSON.stringify({url:location.href,body:document.body.innerText.slice(0,6000)})"));
      assert.fail(label);
    }
    checks.push(label);
    console.log("PASS:", label);
  };
  const contains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const navigate = async (path) => {
    await send("Page.navigate", { url: `${origin}${path}` });
    await pause(750);
  };
  const reload = async () => {
    const previous = pageLoads;
    await send("Page.reload");
    for (let tries = 0; tries < 80 && pageLoads <= previous; tries++) await pause(100);
    await pause(250);
  };
  const screenshot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const path = join(tmpdir(), `silvet-lookbook-${name}.png`);
    await writeFile(path, Buffer.from(data, "base64"));
    console.log("SCREENSHOT:", path);
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/demo/wardrobe");
  await check("Existing wardrobe still loads", contains("My wardrobe"));
  // Delay and fail the real query method so loading, error, and retry are observable.
  await evaluate(`(async () => {
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    const proto=DemoRepository.prototype;
    window.__lookbookTest={proto,list:proto.listOutfits};
    proto.listOutfits=async function(){await new Promise(r=>setTimeout(r,1200));throw new Error('Simulated list failure');};
  })()`);
  await click("Lookbook");
  await check("Grid loading skeleton is visible", "Boolean(document.querySelector('[role=\"status\"][aria-label=\"Loading saved looks\"]'))");
  await check("Grid error offers retry", contains("Your looks didn’t load."));
  await evaluate("window.__lookbookTest.proto.listOutfits=window.__lookbookTest.list");
  await click("Try again");
  await check("Retry loads saved outfit previews", `Boolean(${control("Open this look")}) && ${contains("newest first")}`);
  await screenshot("desktop-grid");
  const initialList = await evaluate("(async()=>{const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');return await new DemoRepository().listOutfits();})()");
  await click("Open this look");
  await check("Detail shows saved pieces and edit action", `Boolean(${control("Edit in Studio")}) && ${contains("The pieces")}`);
  const detailPath = await evaluate("location.pathname");
  const selectedId = decodeURIComponent(detailPath.split("/").pop());
  const selected = initialList.find((outfit) => outfit.id === selectedId);
  assert(selected, "Selected detail belongs to a saved outfit");
  await check("Every saved piece is displayed", `document.querySelectorAll('section[aria-label="Pieces in this look"] article').length===${selected.pieces.length}`);
  await screenshot("desktop-detail");
  await click("Edit in Studio");
  await check("Edit opens Studio with the same outfit id", `new URL(location.href).searchParams.get('outfit')===${JSON.stringify(selectedId)} && ${contains("Make it yours")}`);
  await check("Studio edit preserves saved selections and optional name", `document.querySelector('input[placeholder="e.g. Friday at the gallery"]')?.value===${JSON.stringify(selected.name ?? "")} && document.querySelectorAll('[aria-label^="Replace "]').length>=${selected.pieces.filter((p) => p.itemId).length}`);
  await navigate(detailPath);
  await check("Detail returns without creating an outfit", `Boolean(${control("Delete look")})`);
  await click("Delete look");
  await check("Delete asks for confirmation", contains("The clothing in your wardrobe stays untouched."));
  await click("Keep this look");
  await check("Cancel leaves detail and saved outfit unchanged", `location.pathname===${JSON.stringify(detailPath)} && !document.querySelector('[role="alertdialog"]') && ${contains(selected.name ?? "Untitled look")}`);

  // A genuine sessionStorage write failure must not be swallowed by deletion.
  await evaluate(`(() => {
    window.__storageSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key==='silvet.demo.state.v1') throw new DOMException('Simulated full storage','QuotaExceededError');
      return window.__storageSetItem.call(this,key,value);
    };
  })()`);
  await click("Delete look");
  await click("Delete look");
  await check("Delete storage failure is visible without navigation", `${contains("could not be deleted")} && location.pathname===${JSON.stringify(detailPath)} && Boolean(${control("Retry delete")})`);
  await evaluate("Storage.prototype.setItem=window.__storageSetItem");
  await reload();
  await check("Failed deletion survives reload with the saved pieces intact", `Boolean(${control("Delete look")}) && document.querySelectorAll('section[aria-label="Pieces in this look"] article').length===${selected.pieces.length}`);
  // Delay the real mutation to test pending controls and repeated clicks.
  await evaluate(`(async () => {
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    const proto=DemoRepository.prototype, original=proto.deleteOutfit;
    window.__deleteCalls=0;
    proto.deleteOutfit=async function(id){window.__deleteCalls++;await new Promise(r=>setTimeout(r,900));return original.call(this,id);};
  })()`);
  await click("Delete look");
  await evaluate(`(() => {const b=${control("Delete look")};b.click();b.click();})()`);
  await check("Pending delete cannot be submitted again", "Boolean(document.querySelector('[role=\"alertdialog\"] button[disabled]'))");
  await check("Successful delete returns to Lookbook and shows feedback", `location.pathname==='/demo/lookbook' && ${contains("Look deleted. Your wardrobe is unchanged.")}`);
  await check("Repeated clicks invoke only one deletion", "window.__deleteCalls===1");
  await check("Deleted outfit is absent from persisted data", `!JSON.parse(sessionStorage.getItem('silvet.demo.state.v1')).outfits.some(o=>o.id===${JSON.stringify(selectedId)})`);
  await navigate(detailPath);
  await check("Deleted outfit URL has a proper not-found state", contains("This look is no longer here."));
  await navigate("/demo/lookbook/does-not-exist");
  await check("Unknown outfit id has a proper not-found state", contains("This look is no longer here."));

  // Fixture preparation uses the actual repository, not fabricated success responses.
  const fixture = await evaluate(`(async () => {
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    const repo=new DemoRepository(), template=(await repo.listOutfits())[0];
    const saved=await repo.saveOutfit({input:{name:null,pieces:template.pieces}});
    const removedId=saved.pieces.find(p=>p.itemId)?.itemId;
    await repo.deleteItem(removedId);
    return {id:saved.id,removedId,total:saved.pieces.length};
  })()`);
  await navigate(`/demo/lookbook/${encodeURIComponent(fixture.id)}`);
  await check("Null name has a readable fallback", "document.querySelector('h1')?.textContent==='Untitled look'");
  await check("Removed garment is displayed, never a broken garment link", `${contains("No longer in your wardrobe")} && !document.querySelector('a[href="/demo/wardrobe/${encodeURIComponent(fixture.removedId)}"]') && document.querySelectorAll('section[aria-label="Pieces in this look"] article').length===${fixture.total}`);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("scrollTo(0,0)");
  await pause();
  await screenshot("mobile-detail");
  await check("Mobile detail has usable edit/delete controls without overflow", `document.documentElement.scrollWidth<=innerWidth && Boolean(${control("Edit in Studio")}) && Boolean(${control("Delete look")})`);
  await click("Delete look");
  await check("Mobile delete dialog fits the viewport", `(() => {const r=document.querySelector('[role="alertdialog"]').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight;})()`);
  await click("Keep this look");
  await navigate("/demo/lookbook");
  await check("Mobile grid includes the real unnamed saved outfit", contains("Untitled look"));
  await screenshot("mobile-grid");
  for (const width of [360, 768, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await pause();
    await check(`Lookbook fits ${width}px without horizontal overflow`, "document.documentElement.scrollWidth<=innerWidth");
  }
  await evaluate(`(async () => {
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    const repo=new DemoRepository(), outfit=await repo.getOutfit(${JSON.stringify(fixture.id)});
    for(const id of new Set(outfit.pieces.map(p=>p.itemId).filter(Boolean))) await repo.deleteItem(id);
  })()`);
  await navigate(`/demo/lookbook/${encodeURIComponent(fixture.id)}`);
  await check("An entirely removed outfit remains visible without broken links", `document.querySelectorAll('section[aria-label="Pieces in this look"] article').length===${fixture.total} && !document.querySelector('section[aria-label="Pieces in this look"] a') && document.querySelector('h1')?.textContent==='Untitled look'`);
  await evaluate(`(async () => {
    const {DemoRepository}=await import('/src/data/demo/DemoRepository.ts');
    const repo=new DemoRepository(); for(const outfit of await repo.listOutfits()) await repo.deleteOutfit(outfit.id);
  })()`);
  await navigate("/demo/lookbook");
  await check("Empty Lookbook links to Studio", `Boolean(${control("Create an outfit")}) && (${control("Create an outfit")}).getAttribute('href')==='/demo/style'`);
  await reload();
  await check("Empty Lookbook remains empty after reload", `Boolean(${control("Create an outfit")}) && !${contains("Open this look")}`);
  await click("Create an outfit");
  await check("Empty-state action opens existing Studio", "location.pathname==='/demo/style' && Boolean(document.querySelector('input[placeholder=\"e.g. Friday at the gallery\"]'))");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ result: "passed", checks: checks.length, browserErrors: errors }, null, 2));
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await pause(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
