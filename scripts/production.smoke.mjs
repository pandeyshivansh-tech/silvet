/** Exercises the actual compiled Node server without contacting hosted Supabase. */
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
const port = "5102";
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["dist-server/server/index.js"], { env: { ...process.env, PORT: port }, stdio: "pipe" });
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });
let checks = 0;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { ready = (await fetch(`${origin}/api/health`)).ok; if (ready) break; } catch { /* Starting compiled server. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, `Compiled server starts with supplied PORT: ${output}`); checks++;
  for (const path of ["/", "/demo/wardrobe", "/app/wardrobe/new", "/auth/sign-in"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert((await response.text()).includes('<div id="root">')); checks++;
  }
  assert.equal((await fetch(`${origin}/styleguide`)).status, 200); checks++;
  const assets = await readdir(join(process.cwd(), "dist", "assets"));
  assert(!assets.some((name) => name.toLowerCase().includes("styleguide")), "Production build omits the development-only styleguide chunk"); checks++;
  const html = await (await fetch(origin)).text();
  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert(asset);
  const js = await fetch(origin + asset);
  assert.equal(js.status, 200); assert(js.headers.get("content-type").includes("javascript")); checks++;
  for (const path of ["/assets/missing.js", "/.env", "/server/api.ts", "/api/no-such-endpoint"]) {
    assert.equal((await fetch(origin + path)).status, 404); checks++;
  }
  const denied = await fetch(`${origin}/api/product-import/extract`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://retailer.com" }) });
  assert.equal(denied.status, 401); assert.equal((await denied.json()).code, "unauthenticated"); checks++;
  console.log(`PASS: ${checks} compiled production-server checks (SPA, assets, API, supplied PORT, protected files).`);
} finally {
  child.kill("SIGTERM");
  await once(child, "exit");
}
