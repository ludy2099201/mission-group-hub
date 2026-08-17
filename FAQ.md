# 常見問題

本文件整理恩典同行的開發、資料治理、Cloudflare 準備與 GitHub 協作問題。若問題涉及可識別個人、關懷、代禱、支持、登入憑證或安全漏洞，請不要在公開 Issue 貼出內容，請改依 [SECURITY.md](SECURITY.md) 私下回報。

## 專案定位與授權

### 這是可直接用於正式教會營運的系統嗎？

本專案已具備宣教、小組、關懷、活動、資料治理與角色權限的核心流程，適合受控試行與持續擴充。正式導入前，教會仍應完成真實資料驗收、備份／還原演練、帳號與角色設定、資料保留政策，以及符合當地個資與行政規範的審查。

### 可以商業使用或自行修改嗎？

可以。專案採 [MIT License](LICENSE)，您可依授權條款使用、修改及散布。您仍須自行承擔實際部署、資料治理、服務條款、法規與安全責任。

## 本機開發與測試

### 需要哪些工具？

請使用 Node.js 22 與 pnpm；`.nvmrc` 已標示建議 Node 版本。最基本的驗證流程是：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

`pnpm dev` 可啟動本機開發伺服器。若沒有部署環境提供的 OAuth 與資料庫設定，部分登入或資料功能無法於純本機完整運作；這不代表可省略權限測試，而是應以隔離的開發環境與單元測試驗證。

### 為什麼 `pnpm install` 或 CI 要使用 `--frozen-lockfile`？

此選項會要求安裝結果與 `pnpm-lock.yaml` 完全一致，可避免本機或 CI 在未經審查的情況下取得不同依賴版本。更新依賴時，請讓 lockfile 一併變更並在 Pull Request 說明原因。

### 為什麼建置後有多個 JavaScript 檔案？

專案已採路由層級動態載入及 vendor chunk 分組。這讓使用者不必在第一次開啟儀表板時下載所有大型管理工作區，並讓 Cloudflare 能針對版本化靜態資產有效快取。請以 `pnpm build` 驗證分割後產物，避免在初始 bundle 再度引入不必要的重量級依賴。

## 資料庫、資料匯入與保護

### 如何變更資料表？

先更新 `drizzle/schema.ts`，再產生並審閱遷移 SQL。請特別檢查列舉、外鍵、索引、預設值與既有資料的相容性。若變更不可逆，必須先有備份與回滾方案；不要直接在正式教會資料庫放入測試資料。

### CSV 模板可以直接匯入嗎？

目前模板與瀏覽器端 CSV 預覽用於協助您準備和檢查真實資料；模板只含欄位標頭，且預覽不會上傳或儲存檔案內容。真正批次匯入應在資料品質、角色授權、錯誤回復與稽核流程完成後才啟用。

### 可以把真實會友資料放進 Issue、測試或截圖嗎？

不可以。請勿提交真實名冊、關懷、代禱、支持承諾、出席、照片、聯絡方式、Cookie、資料庫備份或任何可識別資料。測試要使用去識別化本機資料、純函式測試或已獲教會明確同意的最小真實資料；也不可捏造評論、見證或使用者資料作為展示。

### Admin、Leader、Member 的資料範圍有何不同？

Admin 可進行全站管理與資料治理；Leader 只能操作指派小組及其允許的牧養流程；Member 僅能取得公開且低敏感度的資訊。權限必須由伺服器端程序限制，前端隱藏控制項僅是使用體驗而非安全邊界。

## Cloudflare 與 GitHub

### 專案可以直接部署為 Cloudflare Pages 嗎？

目前應用包含 Express、tRPC、OAuth 與受管理資料庫，因此不宜直接當成純靜態 Pages 專案。建議使用 `cloudflare/edge-gateway` 讓 Worker 前置既有受管理 origin；Worker 只處理反向代理、靜態資產快取與安全標頭。完整設定請見 [Cloudflare 掛載與回滾操作手冊](docs/cloudflare-deployment-runbook.md)。

### 哪些回應可以在 Cloudflare 快取？

只有無 Cookie 的 `/assets/*` 靜態 GET／HEAD 回應可以長效快取。API、OAuth、HTML、帶 Cookie 的請求與含 `Set-Cookie` 的回應都必須是 `private, no-store`，否則可能造成登入或個人化資料外洩。

### 為什麼 Cloudflare 部署工作流程顯示 skipped？

這是刻意的安全閘門。除非 repository variable `CLOUDFLARE_DEPLOY_ENABLED` 設為 `true`，且已在 GitHub Secrets 設定最小權限的 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`，否則 Deploy workflow 不會執行。`APP_ORIGIN` 必須在 Cloudflare Worker 設為 secret，不能放入 GitHub 或 repository。

### GitHub CI 正在做什麼？

`Verify` workflow 會在 Pull Request 和 `main` push 時執行 `pnpm check`、`pnpm test` 與 `pnpm build`。同一分支的新提交會取消過時工作流程；Dependabot 會定期提出依賴與 GitHub Actions 更新建議，仍需由維護者審查後才合併。

## 貢獻與疑難排解

### 如何回報錯誤或提出功能需求？

請使用 GitHub 的「問題回報」或「功能建議」表單，提供去識別化的重現步驟、預期結果與環境資訊。若屬於安全或隱私問題，請勿建立公開 Issue，而應依 [SECURITY.md](SECURITY.md) 私下回報。

### CI 失敗時應從哪裡開始？

先在本機依序執行 `pnpm check`、`pnpm test` 與 `pnpm build`。如果 CI 與本機結果不同，請確認 Node.js 22、pnpm lockfile 及作業系統差異。依賴、GitHub Actions 或 Cloudflare 部署設定變更時，請一併檢查 workflow log 與對應文件。

### 貢獻前要看哪些文件？

請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)、[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 與 [SECURITY.md](SECURITY.md)。若貢獻涉及部署、快取或網域，請再閱讀 [Cloudflare 掛載與回滾操作手冊](docs/cloudflare-deployment-runbook.md)。
