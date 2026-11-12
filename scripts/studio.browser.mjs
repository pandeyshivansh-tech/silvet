/**
 * Dependency-free Chromium smoke test.
 * Run while Vite is serving:
 * node --experimental-websocket scripts/studio.browser.mjs
 * SILVET_TEST_URL can override the Replit development URL.
 * Uses an isolated, temporary browser profile, never the user's demo session.
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const origin = process.env.SILVET_TEST_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
if (!origin) throw new Error("Set SILVET_TEST_URL to the running app URL.");
const profile = await mkdtemp(join(tmpdir(), "silvet-studio-test-"));
const port = 19222;
const browser = spawn(process.env.CHROMIUM || "chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const pause = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let nextId = 0;
const pending = new Map();
const failures = [];
const steps = [];

try {
  let pages;
  for (let tries = 0; tries < 30; tries++) {
    try {
      pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (pages.length) break;
    } catch { /* Chromium is starting. */ }
    await pause(200);
  }
  const target = pages?.find((page) => page.type === "page");
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
    if (message.method === "Runtime.exceptionThrown") failures.push(message.params.exceptionDetails);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      failures.push(message.params.args.map((arg) => arg.value ?? arg.description));
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
  const findButton = (text) => `(() => {
    const text=${JSON.stringify(text)};
    const buttons=[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length);
    return buttons.find(b=>b.getAttribute('aria-label')===text) ||
      buttons.find(b=>b.textContent.trim()===text) ||
      buttons.find(b=>b.textContent.includes(text));
  })()`;
  const click = async (text) => {
    const point = await evaluate(`(() => {
      const b=${findButton(text)};
      if(!b || b.disabled) throw new Error('Missing or disabled button: '+${JSON.stringify(text)});
      b.scrollIntoView({block:'center'});
      const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
    await pause();
  };
  const input = async (selector, value) => {
    await evaluate(`(() => {
      const input=document.querySelector(${JSON.stringify(selector)});
      if(!input) throw new Error('Input not found');
      input.scrollIntoView({block:'center'}); input.focus();
      input.select();
    })()`);
    await send("Input.insertText", { text: value });
    await pause(120);
  };
  const check = async (label, expression) => {
    let passed = false;
    for (let tries = 0; tries < 40; tries++) {
      // A reload briefly removes the app's controls. Treat that as not ready,
      // rather than throwing while the assertion is still waiting for the page.
      if (await evaluate(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) {
        passed = true;
        break;
      }
      await pause(200);
    }
    if (!passed) {
      console.error(await evaluate("JSON.stringify({url:location.href,title:document.title,inputs:[...document.querySelectorAll('input')].map(i=>({value:i.value,placeholder:i.placeholder})),buttons:[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Save')).map(b=>({text:b.textContent,disabled:b.disabled})),body:document.body.innerText.slice(0,4500)})"));
      assert.fail(label);
    }
    steps.push(label);
    console.log("PASS:", label);
  };
  const saveDisabled = (label) => `Boolean((${findButton(label)})?.disabled)`;
  const bodyContains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const screenshot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const path = join(tmpdir(), `silvet-studio-${name}.png`);
    await writeFile(path, Buffer.from(data, "base64"));
    console.log("SCREENSHOT:", path);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${origin}/demo/wardrobe?query=cream%20linen&category=tops&subcategory=shirts&color=cream&occasion=everyday&season=summer&style=minimal` });
  await check("Wardrobe URL restores all active filters", `document.querySelector('input[aria-label="Search clothing by name"]').value==='cream linen' && [...document.querySelectorAll('select')].some(s=>s.value==='shirts') && [...document.querySelectorAll('select')].some(s=>s.value==='everyday') && [...document.querySelectorAll('select')].some(s=>s.value==='summer') && [...document.querySelectorAll('select')].some(s=>s.value==='minimal') && ${bodyContains("Cream linen shirt")}`);
  await send("Page.reload");
  await pause(700);
  await check("Reload preserves shareable wardrobe filters", `location.search.includes('season=summer') && document.querySelector('input[aria-label="Search clothing by name"]').value==='cream linen' && ${bodyContains("Cream linen shirt")}`);
  await click("Reset filters");
  await check("Reset filters clears URL state and search", `location.search==='' && document.querySelector('input[aria-label="Search clothing by name"]').value===''`);
  await send("Page.navigate", { url: `${origin}/demo/style` });
  for (let tries = 0; tries < 60; tries++) {
    if (await evaluate(`Boolean(${findButton("Save this look")})`)) break;
    await pause(250);
  }
  await check("Empty draft cannot be saved", saveDisabled("Save this look"));
  await click("Add Top");
  await input('input[aria-label="Search wardrobe"]', "chikankari");
  await check("Picker search filters actual wardrobe items", bodyContains("White chikankari kurta"));
  await click("White chikankari kurta");
  await click("Add Bottom");
  await click("Straight blue jeans");
  await check("Complete separates can be saved", `!${saveDisabled("Save this look")}`);
  await click("Add Footwear");
  await click("Tan Kolhapuris");
  await click("Add Accessory 1");
  await click("Oxidised jhumkas");
  await click("Replace top");
  await check("Current garment is marked selected", `Boolean([...document.querySelectorAll('[role="dialog"] button[aria-pressed="true"]')].find(b=>b.textContent.includes('White chikankari kurta')))`);
  await evaluate(`document.querySelector('[role="dialog"] label').click()`);
  await pause();
  await check("Indian wear filter excludes Western tops", `!document.querySelector('[role="dialog"]').innerText.includes('Oversized white tee')`);
  await click("Mustard cotton kurta");
  await click("Remove bottom");
  await check("Removing a base garment disables saving", saveDisabled("Save this look"));
  await click("Add Bottom");
  await click("Straight blue jeans");
  await click("One-piece / set");
  await check("Switching asks for confirmation", bodyContains("Switch to a one-piece base?"));
  await click("Keep current");
  await check("Cancelling preserves selected garments", bodyContains("Mustard cotton kurta"));
  await click("One-piece / set");
  await click("Switch base");
  await check("Confirmed switch removes separates but retains optional garments", `!${bodyContains("Mustard cotton kurta")} && ${bodyContains("Tan Kolhapuris")} && ${bodyContains("Oxidised jhumkas")}`);
  await click("Add One-piece / set");
  await click("Black slip dress");
  await check("One-piece base can be saved", `!${saveDisabled("Save this look")}`);
  await click("Top + bottom");
  await click("Switch base");
  await check("Switching back clears the one-piece", `!${bodyContains("Black slip dress")} && ${saveDisabled("Save this look")}`);
  await click("Add Top");
  await click("White chikankari kurta");
  await click("Add Bottom");
  await click("Straight blue jeans");
  const name = `Studio browser ${Date.now()}`;
  await input('input[placeholder="e.g. Friday at the gallery"]', name);
  await input("textarea", "Remember the light jacket.");
  await evaluate(`document.querySelector('a[href="/demo/wardrobe"]').click()`);
  await check("Studio navigation shows unsaved-changes confirmation", `Boolean(document.querySelector('[role="alertdialog"]')) && ${bodyContains("Leave unsaved changes?")}`);
  await click("Keep editing");
  await check("Keeping Studio open preserves pieces, name, and editable notes", `${bodyContains("White chikankari kurta")} && document.querySelector('input[placeholder="e.g. Friday at the gallery"]').value===${JSON.stringify(name)} && document.querySelector('textarea').value==='Remember the light jacket.'`);
  await screenshot("desktop");
  await evaluate(`(() => { const b=${findButton("Save this look")}; b.click(); b.click(); })()`);
  await pause(1400);
  const savedUrl = await evaluate("location.href");
  assert(new URL(savedUrl).searchParams.get("outfit"), "Save navigates to editing URL");
  await check("Repeated clicks create only one outfit", `JSON.parse(sessionStorage.getItem('silvet.demo.state.v1')).outfits.filter(o=>o.name===${JSON.stringify(name)}).length===1`);
  await check("Successful save shows feedback", bodyContains("Your look is saved."));
  await send("Page.reload");
  await pause(1000);
  await check("Reload retains name, notes, garments, and unchanged-save protection", `${saveDisabled("Save changes")} && document.querySelector('input[placeholder="e.g. Friday at the gallery"]').value===${JSON.stringify(name)} && document.querySelector('textarea').value==='Remember the light jacket.' && ${bodyContains("White chikankari kurta")}`);
  await input('input[placeholder="e.g. Friday at the gallery"]', `${name} edited`);
  await click("Replace top");
  await click("Mustard cotton kurta");
  await click("Save changes");
  await check("Editing keeps the original outfit id", `location.href===${JSON.stringify(savedUrl)}`);
  await check("Editing shows success feedback", bodyContains("Your look is updated."));
  await send("Page.reload");
  await pause(900);
  await check("Edited outfit persists on reload", `document.querySelector('input[placeholder="e.g. Friday at the gallery"]').value===${JSON.stringify(`${name} edited`)} && ${bodyContains("Mustard cotton kurta")}`);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("scrollTo(0,0)");
  await pause();
  await check("Mobile page has no horizontal overflow", "document.documentElement.scrollWidth <= innerWidth");
  await screenshot("mobile");
  await click("Replace top");
  await screenshot("mobile-picker");
  await check("Mobile picker fits the viewport", `(() => {
    const sheet=document.querySelector('[role="dialog"]'); const r=sheet.getBoundingClientRect();
    return r.left>=0 && r.right<=innerWidth+1 && r.height<=innerHeight;
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 300, y: 650, deltaX: 0, deltaY: 500 });
  await pause();
  await check("Mobile picker scrolls through the wardrobe", `document.querySelector('[role="dialog"] .overflow-y-auto').scrollTop > 0`);
  await click("Close");
  await check("Closing the picker preserves the current garment", `!document.querySelector('[role="dialog"]') && ${bodyContains("Mustard cotton kurta")}`);
  await click("Replace top");
  await input('input[aria-label="Search wardrobe"]', "oxford");
  await click("Blue oxford shirt");
  await click("Remove accessory 1");
  await check("Mobile removal clears the accessory", `!${bodyContains("Oxidised jhumkas")}`);
  await click("Add Accessory 1");
  await click("Oxidised jhumkas");
  await click("Save changes");
  await send("Page.reload");
  await pause(1000);
  await check("Mobile edits save and reload", `${bodyContains("Blue oxford shirt")} && ${bodyContains("Oxidised jhumkas")} && ${saveDisabled("Save changes")}`);
  for (const width of [360, 768, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
    await pause();
    await check(`Layout has no horizontal overflow at ${width}px`, "document.documentElement.scrollWidth <= innerWidth");
  }
  assert.equal(failures.length, 0, `Browser runtime/console errors: ${JSON.stringify(failures)}`);
  console.log(JSON.stringify({ result: "passed", checks: steps.length, savedUrl, browserErrors: failures }, null, 2));
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await pause(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
