# Cloudflare Edge Gateway

此 Worker 是現有受管理全端應用的安全反向代理，而不是 Express／tRPC 的替代品。它僅快取無 Cookie 的 `/assets/*` 靜態 GET／HEAD 回應；API、OAuth、HTML、含 Cookie 與 `Set-Cookie` 的回應一律不共用快取。

## 設定

1. 先在 Cloudflare 建立 Worker，但不要先綁定正式 route。
2. 設定加密環境變數：`npx wrangler secret put APP_ORIGIN`，值為現有受管理應用的 HTTPS origin。
3. 使用 `npx wrangler deploy`，確認 `workers.dev` URL 以登入、API 與靜態資產測試通過。
4. 再由 Cloudflare Dashboard 為自訂網域掛上 route／custom domain，並將 SSL 設為 Full (strict)。

請勿把 `APP_ORIGIN`、Cloudflare API Token、帳號 ID 或任何教會資料寫入本目錄或 GitHub repository。
