import { describe, expect, it, vi } from "vitest";
import { fetchPublic, productUrl, publicAddress, resolvePublic, validateImageBytes, HTML_LIMIT, IMAGE_LIMIT, type Transport } from "./safeFetch";
const resolve = vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]);
const html = { status: 200, type: "text/html", bytes: Buffer.from("<html></html>") };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMZkAAAAASUVORK5CYII=", "base64");

describe("URL and IP validation", () => {
  it.each(["https://store.com/product", "http://store.com/item?size=s", "https://8.8.8.8/"])("accepts public HTTP(S) syntax: %s", (url) => {
    expect(productUrl(url).protocol).toMatch(/^https?:$/);
  });
  it.each(["file:///etc/passwd", "ftp://store.com/a", "data:text/html,foo", "https://user:pass@store.com", "https://store.com:9000", "junk", "", "http://localhost", "http://localhost.", "http://127.1", "http://2130706433", "http://0x7f000001", "http://[::1]", "http://[::ffff:127.0.0.1]", "http://169.254.169.254/latest", "http://168.63.129.16", "http://metadata.google.internal", "http://instance-data.ec2.internal", "http://store.internal", "http://store.local"])("rejects unsafe URL %s", (url) => {
    // Trailing-dot localhost is also rejected during DNS resolution.
    if (url === "http://localhost.") return expect(resolvePublic(productUrl(url), async () => [{ address: "127.0.0.1", family: 4 }])).rejects.toThrow();
    expect(() => productUrl(url)).toThrow();
  });
  it.each(["0.0.0.0", "10.1.2.3", "100.100.100.200", "127.0.0.1", "169.254.169.254", "172.16.2.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "240.0.0.1", "255.255.255.255", "::", "::1", "fc00::1", "fe80::1", "ff02::1", "::ffff:8.8.8.8", "64:ff9b::808:808", "2002:808:808::1", "2001:db8::1", "2001::1", "3fff::1"])("blocks special-use address %s", (ip) => {
    expect(publicAddress(ip)).toBe(false);
  });
  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])("recognizes a public address %s", (ip) => {
    expect(publicAddress(ip)).toBe(true);
  });
  it("rejects mixed public/private DNS answers", async () => {
    await expect(resolvePublic(productUrl("https://store.com"), async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }])).rejects.toMatchObject({ code: "blocked_url" });
  });
  it("rejects empty DNS answers", async () => {
    await expect(resolvePublic(productUrl("https://store.com"), async () => [])).rejects.toThrow();
  });
});

describe("bounded downloads and redirect protection", () => {
  it("passes only the validated IP to the pinned transport", async () => {
    const transport = vi.fn<Transport>().mockResolvedValue(html);
    await fetchPublic("https://store.com/p", "html", { resolve, transport });
    expect(transport).toHaveBeenCalledWith(expect.any(URL), { address: "93.184.216.34", family: 4 }, HTML_LIMIT, expect.any(AbortSignal));
  });
  it("revalidates DNS on every redirect, including the same hostname", async () => {
    const dns = vi.fn().mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }]).mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
    const transport = vi.fn<Transport>().mockResolvedValue({ ...html, status: 302, location: "/second" });
    await expect(fetchPublic("https://store.com", "html", { resolve: dns, transport })).rejects.toMatchObject({ code: "blocked_url" });
    expect(transport).toHaveBeenCalledTimes(1); expect(dns).toHaveBeenCalledTimes(2);
  });
  it.each(["http://127.0.0.1/", "http://169.254.169.254/", "file:///etc/passwd", "http://[::1]/"])("blocks redirect to %s", async (location) => {
    const transport = vi.fn<Transport>().mockResolvedValue({ ...html, status: 302, location });
    await expect(fetchPublic("https://store.com", "html", { resolve, transport })).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("follows a safe relative redirect", async () => {
    const transport = vi.fn<Transport>().mockResolvedValueOnce({ ...html, status: 301, location: "/product" }).mockResolvedValueOnce(html);
    expect((await fetchPublic("https://store.com", "html", { resolve, transport })).url).toBe("https://store.com/product");
  });
  it("caps redirect loops", async () => {
    const transport = vi.fn<Transport>().mockResolvedValue({ ...html, status: 302, location: "/loop" });
    await expect(fetchPublic("https://store.com", "html", { resolve, transport })).rejects.toMatchObject({ code: "redirect" });
    expect(transport).toHaveBeenCalledTimes(5);
  });
  it("times out DNS resolution", async () => {
    await expect(fetchPublic("https://store.com", "html", { resolve: () => new Promise(() => {}), timeout: 10 })).rejects.toMatchObject({ code: "timeout" });
  });
  it("times out stalled downloads", async () => {
    await expect(fetchPublic("https://store.com", "html", { resolve, transport: () => new Promise(() => {}), timeout: 10 })).rejects.toMatchObject({ code: "timeout" });
  });
  it.each([401, 403, 429])("does not bypass access restriction %s", async (status) => {
    await expect(fetchPublic("https://store.com", "html", { resolve, transport: async () => ({ ...html, status }) })).rejects.toMatchObject({ code: "unsupported_retailer" });
  });
  it("rejects non-HTML page responses", async () => {
    await expect(fetchPublic("https://store.com", "html", { resolve, transport: async () => ({ ...html, type: "application/pdf" }) })).rejects.toMatchObject({ code: "not_html" });
  });
  it("enforces HTML body limits", async () => {
    await expect(fetchPublic("https://store.com", "html", { resolve, transport: async () => ({ ...html, bytes: Buffer.alloc(HTML_LIMIT + 1) }) })).rejects.toMatchObject({ code: "too_large" });
  });
  it("accepts a validated private-import PNG response", async () => {
    const result = await fetchPublic("https://cdn.store.com/image.png", "image", { resolve, transport: async () => ({ ...html, type: "image/png", bytes: png }) });
    expect(result.bytes).toEqual(png);
  });
  it("rejects HTML disguised as an image", async () => {
    await expect(fetchPublic("https://store.com/photo", "image", { resolve, transport: async () => ({ ...html, type: "image/png" }) })).rejects.toMatchObject({ code: "invalid_image" });
  });
  it("rejects an image above 10 MiB", async () => {
    await expect(fetchPublic("https://store.com/photo", "image", { resolve, transport: async () => ({ ...html, type: "image/png", bytes: Buffer.alloc(IMAGE_LIMIT + 1) }) })).rejects.toMatchObject({ code: "too_large" });
  });
  it.each(["image/svg+xml", "image/gif", "text/html"])("rejects unsupported image type %s", async (type) => {
    await expect(fetchPublic("https://store.com/photo", "image", { resolve, transport: async () => ({ ...html, type, bytes: png }) })).rejects.toMatchObject({ code: "invalid_image" });
  });
  it("validates PNG/JPEG/WebP signatures against declared MIME", () => {
    expect(() => validateImageBytes(png, "image/png")).not.toThrow();
    expect(() => validateImageBytes(Buffer.from([255, 216, 255, 224]), "image/jpeg")).not.toThrow();
    expect(() => validateImageBytes(Buffer.from("RIFFxxxxWEBP"), "image/webp")).not.toThrow();
    expect(() => validateImageBytes(png, "image/jpeg")).toThrow();
  });
  it("honors a cancelled import", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(fetchPublic("https://store.com", "html", { signal: controller.signal })).rejects.toMatchObject({ code: "timeout" });
  });
});
