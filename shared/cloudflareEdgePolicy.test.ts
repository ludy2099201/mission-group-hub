import { describe, expect, it } from "vitest";
import { edgeSecurityHeaders, isSensitiveDynamicPath, shouldCacheAtEdge } from "./cloudflareEdgePolicy";

describe("Cloudflare 邊緣快取策略", () => {
  it("只快取無 Cookie 的版本化靜態資產", () => {
    expect(shouldCacheAtEdge({ method: "GET", pathname: "/assets/app-abc.js", hasCookie: false, status: 200, hasSetCookie: false, contentType: "text/javascript" })).toBe(true);
    expect(shouldCacheAtEdge({ method: "GET", pathname: "/assets/app-abc.js", hasCookie: true, status: 200, hasSetCookie: false, contentType: "text/javascript" })).toBe(false);
    expect(shouldCacheAtEdge({ method: "GET", pathname: "/", hasCookie: false, status: 200, hasSetCookie: false, contentType: "text/html" })).toBe(false);
  });

  it("將 API 與 OAuth 視為敏感動態路徑", () => {
    expect(isSensitiveDynamicPath("/api/trpc/auth.me")).toBe(true);
    expect(isSensitiveDynamicPath("/api/oauth/callback")).toBe(true);
    expect(isSensitiveDynamicPath("/assets/app-abc.js")).toBe(false);
  });

  it("提供不會改變登入流程的基礎安全標頭", () => {
    expect(edgeSecurityHeaders()).toMatchObject({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY" });
  });
});
