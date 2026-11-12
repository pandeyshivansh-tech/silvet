import { afterEach, describe, expect, it, vi } from "vitest";
import https from "node:https";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { IncomingMessage } from "node:http";
import { pinnedRequest, HTML_LIMIT } from "./safeFetch";

afterEach(() => vi.restoreAllMocks());
function fixture(headers: Record<string, string>, chunks: Buffer[] = [], status = 200) {
  let captured: https.RequestOptions | undefined;
  let capturedUrl: URL | undefined;
  const stream = Object.assign(new PassThrough(), { statusCode: status, headers });
  const fake = ((url: URL, options: https.RequestOptions, callback: (response: IncomingMessage) => void) => {
    captured = options; capturedUrl = url;
    return Object.assign(new EventEmitter(), { end: () => {
      callback(stream as unknown as IncomingMessage);
      for (const chunk of chunks) stream.write(chunk);
      stream.end();
    } });
  }) as unknown as typeof https.request;
  vi.spyOn(https, "request").mockImplementation(fake);
  return { stream, options: () => captured!, url: () => capturedUrl! };
}
describe("actual Node transport options and streaming bounds", () => {
  const address = { address: "8.8.8.8", family: 4 };
  it("pins lookup to the checked IP, disables connection reuse and preserves TLS hostname", async () => {
    const f = fixture({ "content-type": "text/html" }, [Buffer.from("<html>safe</html>")]);
    await pinnedRequest(new URL("https://retailer.com/product"), address, HTML_LIMIT, new AbortController().signal);
    expect(f.url().hostname).toBe("retailer.com");
    expect(f.options().agent).toBe(false); expect(f.options().rejectUnauthorized).not.toBe(false);
    const callback = vi.fn();
    f.options().lookup!("retailer.com", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
    expect(f.options().headers).not.toHaveProperty("Authorization");
    expect(f.options().headers).not.toHaveProperty("Cookie");
  });
  it("rejects an oversized declared response before consuming the body", async () => {
    fixture({ "content-type": "text/html", "content-length": String(HTML_LIMIT + 1) });
    await expect(pinnedRequest(new URL("https://retailer.com"), address, HTML_LIMIT, new AbortController().signal)).rejects.toMatchObject({ code: "too_large" });
  });
  it("rejects an oversized chunked response", async () => {
    fixture({ "content-type": "text/html" }, [Buffer.alloc(HTML_LIMIT), Buffer.alloc(1)]);
    await expect(pinnedRequest(new URL("https://retailer.com"), address, HTML_LIMIT, new AbortController().signal)).rejects.toThrow();
  });
  it("rejects non-HTML types before downloading arbitrary files", async () => {
    fixture({ "content-type": "application/octet-stream" });
    await expect(pinnedRequest(new URL("https://retailer.com"), address, HTML_LIMIT, new AbortController().signal)).rejects.toMatchObject({ code: "not_html" });
  });
  it("rejects unexpected compressed responses to prevent decompression bombs", async () => {
    fixture({ "content-type": "text/html", "content-encoding": "gzip" });
    await expect(pinnedRequest(new URL("https://retailer.com"), address, HTML_LIMIT, new AbortController().signal)).rejects.toMatchObject({ code: "unsupported_response" });
  });
});
