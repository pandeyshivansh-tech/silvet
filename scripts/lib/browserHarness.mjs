import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

export const pause = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
export async function connectPage(url, errors) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item?.reject(new Error("Browser protocol request failed"));
      else item?.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push("Unexpected browser console error");
    const handler = handlers.get(message.method);
    if (handler) void handler(message.params).catch(() => errors.push("Browser fixture handler failed"));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const request = ++id; pending.set(request, { resolve, reject }); socket.send(JSON.stringify({ id: request, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error("Browser evaluation failed");
    return result.result.value;
  };
  await send("Runtime.enable"); await send("Page.enable");
  return { send, evaluate, on: (event, handler) => handlers.set(event, handler), close: () => socket.close() };
}
export async function createBrowserHarness() {
  const origin = process.env.SILVET_TEST_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null);
  assert(origin, "Running app URL is required");
  const directory = await mkdtemp(join(tmpdir(), "silvet-auth-"));
  const port = 19225;
  const browser = spawn(process.env.CHROMIUM || "chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${directory}`, "about:blank"], { stdio: "ignore" });
  const errors = [];
  const pages = [];
  async function targets() { return (await fetch(`http://127.0.0.1:${port}/json`)).json(); }
  async function open(target) {
    const page = await connectPage(target.webSocketDebuggerUrl, errors);
    pages.push(page); return page;
  }
  let target;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { target = (await targets()).find((item) => item.type === "page"); if (target) break; } catch { /* Browser is starting. */ }
    await pause();
  }
  assert(target, "Chromium started");
  const page = await open(target);
  const checks = [];
  async function waitFor(label, expression) {
    let success = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if (await page.evaluate(`Boolean(${expression})`)) { success = true; break; } } catch { /* Navigation is settling. */ }
      await pause();
    }
    assert(success, label);
  }
  async function check(label, expression) {
    await waitFor(label, expression);
    checks.push(label); console.log("PASS:", label);
  }
  const control = (text) => `(() => {
    const controls=[...document.querySelectorAll('button,a')].filter(el=>el.getClientRects().length);
    return controls.find(el=>el.textContent.trim()===${JSON.stringify(text)}) || controls.find(el=>el.textContent.includes(${JSON.stringify(text)}));
  })()`;
  async function click(text) {
    await waitFor(`Control available: ${text}`, `Boolean(${control(text)}) && !(${control(text)}).disabled`);
    await page.evaluate(`(${control(text)}).click()`); await pause();
  }
  async function fill(label, value) {
    await waitFor("Input available", `[...document.querySelectorAll('label')].some(el=>el.textContent.includes(${JSON.stringify(label)}) && Boolean(document.getElementById(el.htmlFor)))`);
    await page.evaluate(`(() => {
      const label=[...document.querySelectorAll('label')].find(el=>el.textContent.includes(${JSON.stringify(label)}));
      const el=document.getElementById(label?.htmlFor); if(!el) throw new Error('Input missing');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});
      el.dispatchEvent(new Event('input',{bubbles:true}));
    })()`); await pause(20);
  }
  async function navigate(path) { await page.send("Page.navigate", { url: origin + path }); await pause(200); }
  async function reload() { await page.send("Page.reload"); await pause(300); }
  return {
    ...page, page, errors, checks, origin, check, click, fill, navigate, reload, control,
    contains: (text) => `document.body.innerText.includes(${JSON.stringify(text)})`,
    async secondPage() {
      const { targetId } = await page.send("Target.createTarget", { url: "about:blank" });
      const target = (await targets()).find((item) => item.id === targetId);
      return open(target);
    },
    async close() { pages.forEach((item) => item.close()); browser.kill("SIGTERM"); await pause(300); await rm(directory, { recursive: true, force: true }); },
  };
}
