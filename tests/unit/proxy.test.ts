import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The portal/public split is a security boundary: login, admin and dashboard must never be served
// on the public domain, and the portal must not serve the marketplace. These tests run the real
// proxy with production settings.
vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn(async () => NextResponse.next()) }));

type ProxyFn = (req: NextRequest) => Promise<Response>;
let proxy: ProxyFn;

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_PORTAL_HOST", "portal.sokobase.co.ke");
  vi.stubEnv("NEXT_PUBLIC_SITE_HOST", "sokobase.co.ke");
  ({ proxy } = (await import("@/proxy")) as unknown as { proxy: ProxyFn });
});

const hit = (host: string, path: string) =>
  proxy(new NextRequest(`https://${host}${path}`, { headers: { host } }));
const location = (res: Response) => res.headers.get("location");

describe("public domain", () => {
  it.each(["/login", "/admin", "/admin/businesses", "/dashboard", "/join?code=ABCD-2345", "/forgot-password", "/reset-password", "/auth/confirm"])(
    "hides portal route %s",
    async (path) => {
      const res = await hit("sokobase.co.ke", path);
      expect(res.status).toBe(307);
      expect(location(res)).toBe("https://sokobase.co.ke/");
    },
  );

  it.each(["/", "/products", "/store/some-shop", "/sell", "/administrator-tips"])("serves %s normally", async (path) => {
    const res = await hit("sokobase.co.ke", path);
    expect(location(res)).toBeNull();
  });
});

describe("portal domain", () => {
  it("sends the bare portal to sign in", async () => {
    expect(location(await hit("portal.sokobase.co.ke", "/"))).toBe("https://portal.sokobase.co.ke/login");
  });

  it.each(["/login", "/dashboard", "/admin", "/join"])("serves %s with a noindex header", async (path) => {
    const res = await hit("portal.sokobase.co.ke", path);
    expect(location(res)).toBeNull();
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("sends marketplace pages back to the public domain, keeping the query", async () => {
    expect(location(await hit("portal.sokobase.co.ke", "/products?q=shoes"))).toBe("https://sokobase.co.ke/products?q=shoes");
  });

  it("lets API routes and static files through on both hosts", async () => {
    expect(location(await hit("portal.sokobase.co.ke", "/api/upload-signature"))).toBeNull();
    expect(location(await hit("portal.sokobase.co.ke", "/icon.svg"))).toBeNull();
  });

  it("does not treat look-alike hosts as the portal", async () => {
    const res = await hit("portal.sokobase.co.ke.evil.com", "/admin");
    expect(location(res)).toBe("https://portal.sokobase.co.ke.evil.com/");
  });
});
