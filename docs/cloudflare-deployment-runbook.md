# Cloudflare 掛載與回滾操作手冊

本手冊以目前「Cloudflare Edge Gateway → 受管理全端 origin」為前提。它不遷移既有 OAuth、tRPC、MySQL／TiDB 或檔案儲存，因此可降低一次性搬遷風險。

## 一次性前置設定

| 場域 | 需要設定 | 原則 |
| --- | --- | --- |
| Cloudflare | Zone、DNS、Worker、WAF、SSL/TLS Full (strict)、route／custom domain。 | Cloudflare 只處理入口、保護與邊緣快取。 |
| Cloudflare Worker | `APP_ORIGIN` secret。 | 值為現有受管理應用的 HTTPS origin，不寫入 Git。 |
| GitHub | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` secrets；`CLOUDFLARE_DEPLOY_ENABLED=true` repository variable。 | Token 應限制於部署此 Worker 所需的 account／resource。 |
| Manus 應用 | 自訂網域與 OAuth callback 允許網域。 | 掛載前確認登入回呼會使用正式自訂網域。 |

## 部署步驟

1. 在 Cloudflare 將目標網域加入 zone，設定 DNS 與 SSL/TLS 為 Full (strict)。
2. 在 Cloudflare Worker 設定 `APP_ORIGIN` secret，指向目前受管理的 HTTPS app origin。
3. 在 GitHub repository 設定兩個 Actions secrets 與 `CLOUDFLARE_DEPLOY_ENABLED=true` variable。
4. 推送 `main` 的 edge gateway 變更，或手動觸發 **Deploy Cloudflare Edge Gateway** workflow。
5. 先以 workers.dev 測試登入、`/api/trpc` 與 `/assets/*`，確認 API 回應帶有 `Cache-Control: private, no-store`。
6. 再在 Cloudflare 綁定自訂 route／custom domain，最後設定必要的 WAF 規則與觀察 Security Events。

## 快取與安全驗收

靜態 `/assets/*` 的無 Cookie 回應應有 `public, max-age=31536000, immutable`。HTML、`/api/*`、`/api/oauth/*`、任何 Cookie 請求及含 `Set-Cookie` 的回應必須是 `private, no-store`。確認 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options` 與 `Permissions-Policy` 存在；先不要在未檢視 OAuth 與第三方資源前強制加入 Content-Security-Policy。

## 回滾

如登入、API 或管理頁異常，先在 Cloudflare 移除正式 route 或停用 Worker custom domain，使流量回到原本受管理入口；接著在 GitHub 將 `CLOUDFLARE_DEPLOY_ENABLED` 設為 `false`，並以 Git commit／Worker version 回復設定。不要先清除 origin、資料庫或 OAuth 設定。
