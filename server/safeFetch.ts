import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { ImportError } from "./errors.js";

export const HTML_LIMIT = 2 * 1024 * 1024;
export const IMAGE_LIMIT = 10 * 1024 * 1024;
const TIMEOUT_MS = 12000;
export type Address = { address: string; family: number };
export type Resolver = (hostname: string) => Promise<Address[]>;

export function publicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    // IPv4-mapped/transition IPv6 and special-use ranges are not destinations.
    if (parsed instanceof ipaddr.IPv6) {
      return parsed.range() === "unicast" &&
        parsed.match(ipaddr.IPv6.parse("2000::"), 3) &&
        !parsed.match(ipaddr.IPv6.parse("2001::"), 23) &&
        !parsed.match(ipaddr.IPv6.parse("2002::"), 16) &&
        !parsed.match(ipaddr.IPv6.parse("3fff::"), 20);
    }
    return parsed.range() === "unicast" && address !== "168.63.129.16";
  } catch { return false; }
}

export function productUrl(input: unknown): URL {
  if (typeof input !== "string" || input.length > 4096)
    throw new ImportError("invalid_url", "Enter a valid HTTP or HTTPS product URL.");
  let url: URL;
  try { url = new URL(input.trim()); }
  catch { throw new ImportError("invalid_url", "Enter a valid HTTP or HTTPS product URL."); }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    (url.port && url.port !== "80" && url.port !== "443"))
    throw new ImportError("invalid_url", "Use an HTTP or HTTPS URL without credentials or a custom port.");
  if (!hostname.includes(".") && !ipaddr.isValid(hostname) ||
    /(^|\.)(localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(hostname) ||
    hostname === "metadata.google.internal" || hostname === "instance-data.ec2.internal" ||
    (ipaddr.isValid(hostname) && !publicAddress(hostname)))
    throw new ImportError("blocked_url", "Private, internal and metadata URLs cannot be imported.");
  url.hash = "";
  return url;
}

export async function resolvePublic(url: URL, resolve: Resolver = (host) => lookup(host, { all: true, verbatim: true })): Promise<Address[]> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = ipaddr.isValid(host) ? [{ address: host, family: ipaddr.parse(host).kind() === "ipv4" ? 4 : 6 }] : await resolve(host);
  // Fail closed if ANY answer is private, not just the first one.
  if (!addresses.length || addresses.some((entry) => !publicAddress(entry.address)))
    throw new ImportError("blocked_url", "This URL resolves to a private or blocked network.");
  return addresses;
}

export interface Resource { bytes: Buffer; type: string; url: string }
export interface ResponseData { status: number; location?: string; type: string; bytes: Buffer }
export type Transport = (url: URL, address: Address, limit: number, signal: AbortSignal) => Promise<ResponseData>;

/** Connect only to a prevalidated IP, preserving hostname for Host, TLS/SNI and certificate checks. */
export const pinnedRequest: Transport = (url, address, limit, signal) => new Promise((resolve, reject) => {
  const request = (url.protocol === "https:" ? https : http).request(url, {
    method: "GET", agent: false, signal, family: address.family,
    lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    maxHeaderSize: 16384,
    headers: { Accept: "text/html,application/xhtml+xml,image/jpeg,image/png,image/webp", "Accept-Encoding": "identity", "User-Agent": "SILVET-ProductImport/1.0" },
  }, (response) => {
    const status = response.statusCode ?? 502;
    const type = (response.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
    // Never read bodies for redirects or errors.
    if (status !== 200) {
      response.destroy();
      resolve({ status, location: response.headers.location, type, bytes: Buffer.alloc(0) });
      return;
    }
    const allowed = limit === HTML_LIMIT ? ["text/html", "application/xhtml+xml"] : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(type)) {
      response.destroy();
      reject(new ImportError(limit === HTML_LIMIT ? "not_html" : "invalid_image", limit === HTML_LIMIT
        ? "This URL does not return a supported product page." : "Choose a JPEG, PNG or WebP product image."));
      return;
    }
    if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
      response.destroy();
      reject(new ImportError("unsupported_response", "This retailer returned an unsupported compressed response."));
      return;
    }
    if (Number(response.headers["content-length"]) > limit) {
      response.destroy(); reject(new ImportError("too_large", "The downloaded response exceeds the size limit.")); return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    response.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) response.destroy(new ImportError("too_large", "The downloaded response exceeds the size limit."));
      else chunks.push(chunk);
    });
    response.on("end", () => resolve({ status, type, bytes: Buffer.concat(chunks) }));
    response.on("error", reject);
    response.on("aborted", () => reject(new ImportError("network", "The download was interrupted. Please retry.", 502)));
  });
  request.on("error", reject);
  request.end();
});

/** One deadline covers DNS, redirects and body download. No cookie/auth forwarding. */
export async function fetchPublic(input: string, kind: "html" | "image", dependencies: { resolve?: Resolver; transport?: Transport; timeout?: number; signal?: AbortSignal } = {}): Promise<Resource> {
  let url = productUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), dependencies.timeout ?? TIMEOUT_MS);
  const abort = () => controller.abort();
  dependencies.signal?.addEventListener("abort", abort, { once: true });
  if (dependencies.signal?.aborted) controller.abort();
  const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new ImportError("timeout", "The retailer took too long to respond. Try manual entry.", 504)), { once: true }));
  try {
    for (let hop = 0; hop <= 4; hop++) {
      if (controller.signal.aborted) throw new ImportError("timeout", "The download was cancelled or timed out.", 504);
      const addresses = await Promise.race([resolvePublic(url, dependencies.resolve), aborted]);
      const response = await Promise.race([(dependencies.transport ?? pinnedRequest)(url, addresses[0]!, kind === "html" ? HTML_LIMIT : IMAGE_LIMIT, controller.signal), aborted]);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (!response.location || hop === 4) throw new ImportError("redirect", "The retailer redirected too many times or returned an invalid redirect.");
        url = productUrl(new URL(response.location, url).href);
        continue;
      }
      if ([401, 403, 429].includes(response.status))
        throw new ImportError("unsupported_retailer", "This retailer restricts automated access. Please use manual entry.");
      if (response.status !== 200) throw new ImportError("unavailable", "This page or image is unavailable. Please use manual entry.", 502);
      const allowed = kind === "html" ? ["text/html", "application/xhtml+xml"] : ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(response.type)) throw new ImportError(kind === "html" ? "not_html" : "invalid_image",
        kind === "html" ? "This URL does not return a supported product page." : "Choose a JPEG, PNG or WebP product image.");
      if (!response.bytes.length || response.bytes.length > (kind === "html" ? HTML_LIMIT : IMAGE_LIMIT))
        throw new ImportError("too_large", "The downloaded response is empty or exceeds the size limit.");
      if (kind === "image") validateImageBytes(response.bytes, response.type);
      return { bytes: response.bytes, type: response.type, url: url.href };
    }
    throw new ImportError("redirect", "Too many redirects.");
  } catch (error) {
    if (error instanceof ImportError) throw error;
    if (controller.signal.aborted) throw new ImportError("timeout", "The retailer took too long to respond. Try manual entry.", 504);
    throw new ImportError("network", "We could not reach the retailer. Check the URL or use manual entry.", 502);
  } finally {
    clearTimeout(timer);
    dependencies.signal?.removeEventListener("abort", abort);
  }
}

export function validateImageBytes(bytes: Buffer, type: string) {
  const valid = type === "image/png" ? bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString("ascii", 12, 16) === "IHDR"
    : type === "image/jpeg" ? bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : type === "image/webp" ? bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" : false;
  if (!valid) throw new ImportError("invalid_image", "The downloaded file is not a valid JPEG, PNG or WebP image.");
}
