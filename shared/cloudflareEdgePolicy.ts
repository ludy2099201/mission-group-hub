export type EdgeCacheInput = {
  method: string;
  pathname: string;
  hasCookie: boolean;
  status: number;
  hasSetCookie: boolean;
  contentType: string | null;
};

export function shouldCacheAtEdge(input: EdgeCacheInput) {
  if (input.method !== "GET" && input.method !== "HEAD") return false;
  if (!input.pathname.startsWith("/assets/")) return false;
  if (input.hasCookie || input.hasSetCookie || input.status !== 200) return false;
  const type = input.contentType?.toLowerCase() ?? "";
  return !type.includes("text/html") && !type.includes("application/json");
}

export function isSensitiveDynamicPath(pathname: string) {
  return pathname.startsWith("/api/") || pathname.startsWith("/api/oauth/");
}

export function edgeSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
