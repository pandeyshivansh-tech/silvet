// Lossless, 1 CSS px = 1 image px proof capture using the existing Chromium.
// This is an isolated design utility, not an application/browser-suite change.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const port = 19226;
const browser = spawn("/repl/tools/bin/chromium", [
  "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  "--force-device-scale-factor=1", `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/silvet-brand-proof-${process.pid}`, "about:blank",
], { stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      break;
    } catch { await pause(100); }
  }
  if (!targets) throw new Error("Chromium did not start");
  socket = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let serial = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const promise = pending.get(message.id);
      if (promise) {
        pending.delete(message.id);
        if (message.error) promise.reject(new Error(message.error.message));
        else promise.resolve(message.result);
      }
    }
    if (message.method === "Runtime.exceptionThrown") errors.push("Browser exception");
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400)
      errors.push(`HTTP ${message.params.response.status}`);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error("Proof expression failed");
    return result.result.value;
  };
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  const captures = [
    ["comparison.html", 1800, "comparison.png"],
    ["a-selvedge/proof.html", 880, "a-selvedge/proof.png"],
    ["b-stitched/proof.html", 880, "b-stitched/proof.png"],
    ["c-fold/proof.html", 880, "c-fold/proof.png"],
  ];
  const report = [];
  for (const [path, width, output] of captures) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call("Page.navigate", { url: `http://127.0.0.1:5905/${path}` });
    for (let i = 0; i < 100; i++) {
      if (await evaluate('document.readyState==="complete" && !!document.querySelector(".proof")')) break;
      await pause(50);
    }
    await evaluate("document.fonts.ready.then(()=>true)");
    const height = await evaluate("Math.ceil(document.documentElement.scrollHeight)");
    const overflow = await evaluate("document.documentElement.scrollWidth > innerWidth");
    const dimensions = await evaluate('Array.from(document.querySelectorAll(".size-cell .sample > svg")).map(s=>Math.round(s.getBoundingClientRect().width))');
    if (overflow) throw new Error(`Horizontal overflow in ${path}`);
    if (!dimensions.every((n, i) => n === [16, 24, 32][i % 3])) throw new Error("Native specimen sizing changed");
    const image = await call("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    await writeFile(join(root, output), Buffer.from(image.data, "base64"));
    if (path !== "comparison.html") {
      const rects = await evaluate('Array.from(document.querySelectorAll(".size-cell .sample > svg[width=\\"16\\"]")).map(s=>{const r=s.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})');
      await mkdir(join(root, "assets"), { recursive: true });
      for (let i = 0; i < rects.length; i++) {
        const tiny = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: rects[i] });
        await writeFile(join(root, "assets", `${path.split("/")[0]}-16px-${i ? "dark" : "light"}.png`), Buffer.from(tiny.data, "base64"));
      }
    }
    report.push({ path, width, height, nativeSizes: dimensions, horizontalOverflow: overflow });
  }
  // A phone-width file view must remain usable; these are proofs, not app integration.
  await call("Emulation.setDeviceMetricsOverride", { width: 360, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: "http://127.0.0.1:5905/comparison.html" });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('document.readyState==="complete" && !!document.querySelector(".proof")')) break;
    await pause(50);
  }
  const phoneOverflow = await evaluate("document.documentElement.scrollWidth > innerWidth");
  if (phoneOverflow) throw new Error("Phone-width proof overflows");
  if (errors.length) throw new Error(errors.join(", "));
  await writeFile(join(root, "render-verification.json"), JSON.stringify({ report, phoneWidth: 360, phoneOverflow, browserErrors: errors }, null, 2));
  console.log(JSON.stringify({ report, phoneWidth: 360, phoneOverflow, browserErrors: errors }, null, 2));
} finally {
  socket?.close();
  browser.kill("SIGTERM");
}
