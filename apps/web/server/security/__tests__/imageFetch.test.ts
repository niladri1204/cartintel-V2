import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { lookup, request } = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));
vi.mock("node:http", () => ({ request }));
vi.mock("node:https", () => ({ request }));

import { fetchSafeImage, validateOutboundImageUrl } from "../imageFetch";

type FakeResponse = EventEmitter & { statusCode: number; headers: Record<string, string>; resume: () => void };
function response(statusCode = 200, headers: Record<string, string> = { "content-type": "image/png", "content-length": "1" }, chunks = [Buffer.from("x")]): FakeResponse {
  const result = Object.assign(new EventEmitter(), { statusCode, headers, resume: vi.fn() });
  queueMicrotask(() => { for (const chunk of chunks) result.emit("data", chunk); result.emit("end"); });
  return result;
}

describe("outbound image URL security", () => {
  beforeEach(() => {
    lookup.mockReset(); request.mockReset();
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    request.mockImplementation((_options: unknown, callback: (res: FakeResponse) => void) => ({ setTimeout: vi.fn(), on: vi.fn(), end: () => callback(response()), destroy: vi.fn() }));
  });

  test.each([
    "http://localhost", "http://localhost:3000", "http://127.0.0.1", "http://127.0.0.1:3000", "http://0.0.0.0", "http://[::1]",
    "http://10.0.0.1", "http://172.16.1.1", "http://192.168.1.1", "http://169.254.169.254", "http://[fc00::1]", "http://[fe80::1]",
    "http://metadata.google.internal", "ftp://example.com/image.jpg", "file:///etc/passwd", "not a url",
  ])("rejects restricted or malformed destination %s", async (url) => await expect(validateOutboundImageUrl(url)).rejects.toThrow());

  test.each(["fe80::1", "fe90::1", "fea0::1", "feb0::1", "fe8a:0000:0000:0000:0000:0000:0000:0001"])("rejects every representative IPv6 link-local /10 address %s", async (address) => {
    await expect(validateOutboundImageUrl(`http://[${address}]/image.png`)).rejects.toThrow(/restricted/);
  });

  test("rejects a public hostname resolving to a private address", async () => {
    lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    await expect(validateOutboundImageUrl("https://images.example.com/a.jpg")).rejects.toThrow(/restricted/);
  });

  test.each(["https://images.example.com/a.jpg", "http://images.example.com/a.jpg"])("allows public HTTP(S) URL %s", async (url) => {
    await expect(validateOutboundImageUrl(url)).resolves.toMatchObject({ url: expect.any(URL), address: { address: "93.184.216.34", family: 4 } });
  });

  test("pins the validated address for the actual connection, preventing DNS rebinding", async () => {
    await fetchSafeImage("https://images.example.com/a.jpg");
    const options = request.mock.calls[0][0] as { hostname: string; lookup: (host: string, options: unknown, callback: (error: Error | null, address: string, family: number) => void) => void; rejectUnauthorized: boolean; servername: string };
    let actualAddress = ""; let actualFamily = 0;
    options.lookup("images.example.com", {}, (_error, address, family) => { actualAddress = address; actualFamily = family; });
    expect(options.hostname).toBe("images.example.com");
    expect(actualAddress).toBe("93.184.216.34");
    expect(actualFamily).toBe(4);
    expect(options.rejectUnauthorized).toBe(true);
    expect(options.servername).toBe("images.example.com");
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  test.each([
    [302, { location: "http://127.0.0.1/private" }, /redirect/],
    [200, { "content-type": "text/html", "content-length": "1" }, /content type/],
    [200, { "content-type": "image/png", "content-length": String(6 * 1024 * 1024) }, /too large/],
  ])("rejects unsafe image responses", async (status, headers, error) => {
    request.mockImplementation((_options: unknown, callback: (res: FakeResponse) => void) => ({ setTimeout: vi.fn(), on: vi.fn(), end: () => callback(response(status, headers)), destroy: vi.fn() }));
    await expect(fetchSafeImage("https://images.example.com/a.jpg")).rejects.toThrow(error);
  });

  test("sets a five-second request timeout without retries", async () => {
    await fetchSafeImage("https://images.example.com/a.jpg");
    const fakeRequest = request.mock.results[0].value as { setTimeout: ReturnType<typeof vi.fn> };
    expect(fakeRequest.setTimeout).toHaveBeenCalledWith(5_000, expect.any(Function));
    expect(request).toHaveBeenCalledTimes(1);
  });
});
