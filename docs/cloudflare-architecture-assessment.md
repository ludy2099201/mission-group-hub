# Cloudflare 掛載相容性評估

**評估日期：2026-08-17（GMT+8）**

## 建議結論

目前專案是 React、Vite、Express、tRPC、受管理 OAuth 與 MySQL／TiDB 的全端應用。它不應直接視為純靜態 Pages 專案，也不宜在沒有驗證與資料遷移計畫的情況下，把 Express 伺服器直接改寫成 Cloudflare Worker。建議採用**Cloudflare Edge Gateway**：以 Worker 對外提供自訂網域、TLS、CDN、安全標頭與靜態資產快取，而現有受管理應用仍作為受保護的動態 origin。

此做法保留既有 OAuth、tRPC、資料庫、檔案儲存與部署行為，同時將可安全快取的 Vite 版本化靜態資產推向 Cloudflare 邊緣。API、OAuth、HTML、含 Cookie 或 `Set-Cookie` 的回應一律不進共用快取，避免使用者資料與登入狀態被跨使用者快取。Cloudflare Workers 的靜態資產可不進 Worker script，而動態 Worker 呼叫仍受方案額度限制，因此路由分流與避免不必要的 Worker 執行是免費架構的關鍵。[1] [2]

| 元件 | 現階段配置 | Cloudflare 責任 | 不在本輪遷移 |
| --- | --- | --- |
| 公開與登入網域 | 自訂網域指向 Edge Gateway | DNS、TLS、WAF、邊緣路由、安全標頭。 | 不取代現有 OAuth。 |
| 前端靜態資產 | 現有 Vite build 的 `/assets/*` | 僅針對無 Cookie 的 GET／HEAD 快取。 | 不將全端 app 改成 Pages 靜態輸出。 |
| 動態 app 與 API | 現有受管理 Node origin | 透明反向代理，明確禁用共用快取。 | 不搬遷 Express／tRPC。 |
| 資料庫與檔案 | 既有受管理服務 | 不直接存取或複製資料。 | 不直接遷移至 D1／R2。 |
| GitHub | `main` 為正式分支 | CI 測試；在已設定 Secrets 後部署 Worker。 | 不提交 Cloudflare Token。 |

## 快取與安全規則

| 路徑／回應 | Edge 行為 | 理由 |
| --- | --- | --- |
| `/assets/*` 的 GET／HEAD，且無 Cookie | 以 1 年 immutable 快取。 | Vite 檔名含內容雜湊，適合長效快取。 |
| `/api/*`、`/api/oauth/*` | 明確 `no-store`，不共用快取。 | 屬使用者或工作階段敏感資料。 |
| HTML、任意 `Set-Cookie`、有 Cookie 請求 | 不快取。 | 避免認證與個人化內容被錯誤共用。 |
| 其他檔案 | passthrough；僅加安全標頭。 | 保留 origin 行為，避免快取動態內容。 |

## 部署分工

GitHub Actions 應先執行型別檢查、測試與 build，再由已限制權限的 Cloudflare API Token 呼叫 Wrangler 部署。Cloudflare Token、帳號 ID、production origin 只能存在 GitHub Secrets／Cloudflare Secrets，不能寫進 repo 或 workflow。[3] [4]

Cloudflare Pages 可以在後續用於獨立的公開文件或行銷網站；若保留全端 app 的現況，Pages 不應直接承擔 Express 動態程序。正式將 Worker 掛載至網域前，仍須由帳號擁有人設定 Cloudflare zone、DNS、origin URL、WAF 規則與 GitHub Secrets。

## References

[1] [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)  
[2] [Cloudflare Workers Platform Limits](https://developers.cloudflare.com/workers/platform/limits/)  
[3] [Cloudflare Wrangler GitHub Action](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)  
[4] [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
