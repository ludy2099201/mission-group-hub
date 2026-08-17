import { edgeSecurityHeaders, isSensitiveDynamicPath, shouldCacheAtEdge } from "../../../shared/cloudflareEdgePolicy";

export interface Env {
  APP_ORIGIN: string;
}

function responseWithHeaders(response: Response, pathname: string) {
  const headers = new Headers(response.headers);
  Object.entries(edgeSecurityHeaders()).forEach(([key, value]) => headers.set(key, value));
  if (isSensitiveDynamicPath(pathname) || headers.has("Set-Cookie")) headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!env.APP_ORIGIN) return new Response("APP_ORIGIN 尚未設定。", { status: 503, headers: { "Cache-Control": "no-store" } });
    const upstream = new URL(env.APP_ORIGIN);
    const target = new URL(request.url);
    target.protocol = upstream.protocol;
    target.host = upstream.host;
    target.port = upstream.port;

    const mayUseAssetCache = (request.method === "GET" || request.method === "HEAD") && target.pathname.startsWith("/assets/") && !request.headers.has("Cookie");
    const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
    if (mayUseAssetCache) {
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;
    }

    const originRequest = new Request(target.toString(), request);
    const originResponse = await fetch(originRequest, { cf: { cacheEverything: false, cacheTtl: 0 } });
    const response = responseWithHeaders(originResponse, target.pathname);
    const cacheable = shouldCacheAtEdge({ method: request.method, pathname: target.pathname, hasCookie: request.headers.has("Cookie"), status: response.status, hasSetCookie: response.headers.has("Set-Cookie"), contentType: response.headers.get("Content-Type") });

    if (cacheable) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      const cacheResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      ctx.waitUntil(caches.default.put(cacheKey, cacheResponse.clone()));
      return cacheResponse;
    }

    return response;
  },
};
