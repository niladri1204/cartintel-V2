import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as http from "node:http";
import * as https from "node:https";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5_000;
const supportedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type ResolvedAddress = { address: string; family: 4 | 6 };

function isPrivateIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
}

function ipv6Bytes(value: string): Buffer | null {
  const address = value.replace(/^\[|\]$/g, "");
  if (isIP(address) !== 6) return null;
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const expand = (part: string): string[] => part ? part.split(":") : [];
  const left = expand(halves[0]);
  const right = halves.length === 2 ? expand(halves[1]) : [];
  const normalizeIpv4Tail = (parts: string[]): string[] => {
    const final = parts.at(-1);
    if (!final || isIP(final) !== 4) return parts;
    const bytes = final.split(".").map(Number);
    return [...parts.slice(0, -1), ((bytes[0] << 8) | bytes[1]).toString(16), ((bytes[2] << 8) | bytes[3]).toString(16)];
  };
  const normalizedLeft = normalizeIpv4Tail(left);
  const normalizedRight = normalizeIpv4Tail(right);
  const missing = 8 - normalizedLeft.length - normalizedRight.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const parts = [...normalizedLeft, ...Array(Math.max(0, missing)).fill("0"), ...normalizedRight];
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/i.test(part))) return null;
  const result = Buffer.alloc(16);
  parts.forEach((part, index) => result.writeUInt16BE(Number.parseInt(part, 16), index * 2));
  return result;
}

function isRestrictedIpv6(value: string): boolean {
  const bytes = ipv6Bytes(value);
  if (!bytes) return false;
  const unspecified = bytes.every((byte) => byte === 0);
  const loopback = bytes.subarray(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
  const uniqueLocal = (bytes[0] & 0xfe) === 0xfc; // fc00::/7
  const linkLocal = bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80; // fe80::/10
  const ipv4Mapped = bytes.subarray(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  return unspecified || loopback || uniqueLocal || linkLocal || (ipv4Mapped && isPrivateIpv4([...bytes.subarray(12)].join(".")));
}

function isRestrictedIp(value: string): boolean {
  const normalized = value.replace(/^\[|\]$/g, "");
  return isIP(normalized) === 4 ? isPrivateIpv4(normalized) : isRestrictedIpv6(normalized);
}

export async function validateOutboundImageUrl(input: string): Promise<{ url: URL; address: ResolvedAddress }> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Image URL is invalid."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Image URL must use HTTP or HTTPS.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal" || host === "metadata.aws.internal" || isRestrictedIp(host)) throw new Error("Image URL points to a restricted network destination.");
  let addresses: ResolvedAddress[];
  try { addresses = (await lookup(host, { all: true, verbatim: true })).filter((entry): entry is ResolvedAddress => entry.family === 4 || entry.family === 6); } catch { throw new Error("Image URL hostname could not be resolved."); }
  if (!addresses.length || addresses.some(({ address }) => isRestrictedIp(address))) throw new Error("Image URL points to a restricted network destination.");
  return { url, address: addresses[0] };
}

async function requestPinnedImage(url: URL, address: ResolvedAddress): Promise<{ body: Buffer; mimeType: string }> {
  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: { Accept: "image/jpeg,image/png,image/webp,image/gif" },
      servername: url.hostname,
      rejectUnauthorized: true,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) { response.resume(); reject(new Error("Image redirects are not supported.")); return; }
      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) { response.resume(); reject(new Error("Image could not be fetched.")); return; }
      const mimeType = response.headers["content-type"]?.split(";", 1)[0]?.toLowerCase() ?? "";
      if (!supportedMediaTypes.has(mimeType)) { response.resume(); reject(new Error("Image content type is not supported.")); return; }
      const length = Number(response.headers["content-length"] ?? "0");
      if (!Number.isFinite(length) || length > MAX_IMAGE_BYTES) { response.resume(); reject(new Error("Image is too large.")); return; }
      const chunks: Buffer[] = []; let total = 0;
      response.on("data", (chunk: Buffer) => { total += chunk.length; if (total > MAX_IMAGE_BYTES) request.destroy(new Error("Image is too large.")); else chunks.push(chunk); });
      response.on("end", () => resolve({ body: Buffer.concat(chunks), mimeType }));
      response.on("error", reject);
    });
    request.setTimeout(FETCH_TIMEOUT_MS, () => request.destroy(new Error("Image fetch timed out.")));
    request.on("error", reject);
    request.end();
  });
}

export async function fetchSafeImage(input: string): Promise<{ base64: string; mimeType: string }> {
  const { url, address } = await validateOutboundImageUrl(input);
  const image = await requestPinnedImage(url, address);
  return { base64: image.body.toString("base64"), mimeType: image.mimeType };
}

export const imageFetchLimits = { MAX_IMAGE_BYTES, FETCH_TIMEOUT_MS };
