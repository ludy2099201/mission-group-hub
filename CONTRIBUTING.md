# 貢獻指南

感謝您協助改善**恩典同行**。這是一個處理教會行政與牧養資料的開源專案；所有貢獻都應以**資料最小化、最小權限、可追溯性與不傷害使用者**為預設原則。若您首次參與，建議先閱讀 [README.md](README.md)、[SECURITY.md](SECURITY.md)、[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 與 [FAQ.md](FAQ.md)。

## 開始前的準備

專案目前以 Node.js 22、pnpm 與 MySQL／TiDB 相容資料庫開發；`.nvmrc` 已指定建議的 Node 版本。由於原始專案整合受管理 OAuth 與執行環境，自行執行時可能需要提供等效的資料庫、OAuth、儲存及環境變數設定。請勿將任何 `.env`、Token、資料庫連線字串、真實教會資料或備份檔提交至 Git。

```bash
git clone https://github.com/ludy2099201/mission-group-hub.git
cd mission-group-hub
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm dev
```

| 指令 | 用途 | 貢獻時機 |
| --- | --- | --- |
| `pnpm dev` | 啟動本機開發伺服器。 | 開發介面或串接流程時。 |
| `pnpm check` | 執行 TypeScript 型別檢查。 | 每次提交前。 |
| `pnpm test` | 執行 Vitest 單元與權限測試。 | 每次提交前。 |
| `pnpm build` | 建置前端與伺服器產物。 | 修改路由、建置或部署設定後。 |

> 不要為了驗收而在公開／共用資料庫插入測試會友、關懷、代禱、支持或出席資料。請以單元測試、去識別化本機資料，或教會自行提供並同意使用的最小真實資料進行驗證。

## 建議的分支與提交流程

請從最新 `main` 建立短生命週期分支，例如 `feat/attendance-export`、`fix/leader-scope` 或 `docs/import-faq`。提交訊息應使用清楚的動詞與範圍，例如 `feat: add attendance export`、`fix: restrict confidential group access` 或 `docs: clarify local setup`。功能開發完成後，以 Pull Request 合併；不要直接在 `main` 手動進行未經驗證的大型修改。

GitHub CI 會在 Pull Request 與 `main` push 時執行型別檢查、測試及正式建置。若同一分支連續推送，舊的 Verify workflow 會自動取消，以節省 CI 資源並讓最新提交成為唯一結果。

## 專案結構與責任邊界

| 位置 | 用途 | 變更注意事項 |
| --- | --- | --- |
| `client/src/pages/` | 各管理工作區與頁面。 | 維持繁體中文、空狀態、錯誤狀態與行動版可用性。 |
| `client/src/components/` | 可重用介面與 Dashboard 版型。 | 優先重用既有元件，避免建立重複互動。 |
| `server/routers.ts` | tRPC 程序與伺服器端權限邊界。 | 所有敏感資料存取必須在此層或其呼叫的服務層驗證。 |
| `server/db.ts` | Drizzle 查詢與資料操作。 | 保持查詢可測試，避免在前端自行繞過存取控制。 |
| `drizzle/schema.ts` | 資料表、欄位、索引與型別。 | Schema 變更必須伴隨遷移檔與相容性審查。 |
| `shared/` | 前後端共用的純函式、驗證及測試。 | 適合放置快取、CSV、篩選與權限規則。 |
| `cloudflare/edge-gateway/` | Cloudflare Worker 反向代理與快取規則。 | 不得提交 `APP_ORIGIN`、Token 或任何生產設定。 |

## 資料庫與遷移

資料模型應先在 `drizzle/schema.ts` 完成，再產生遷移 SQL。請先閱讀 SQL，確認操作不會意外刪除、改寫或鎖定既有資料，然後才套用至適當環境。變更外鍵、列舉、唯一索引或權限模型時，請在 Pull Request 明確說明舊資料如何相容或遷移。

| 變更類型 | Pull Request 必須說明 |
| --- | --- |
| 新增欄位或資料表 | 欄位目的、預設值、索引及資料所有者。 |
| 修改列舉或限制 | 舊值相容策略與回滾方式。 |
| 敏感資料欄位 | 存取角色、遮罩策略、稽核需求及保留期限。 |
| 刪除或不可逆變更 | 備份、演練與人工確認流程。 |

## 權限、隱私與敏感資料

Admin、Leader 與 Member 的差異必須在伺服器端執行，而不能只依賴前端隱藏按鈕。新增功能時，請至少測試授權角色的正向案例與未授權角色的拒絕案例。保密小組、關懷、代禱、支持承諾、聯絡方式與匯出檔都應假設為敏感資料；只傳回完成目前工作所需的最少欄位。

不可提交的內容包括真實會友名冊、關懷日誌、代禱內容、支持紀錄、奉獻資料、聯絡方式、截圖、資料庫 dump、OAuth cookie、API key 及任何可重新識別個人的資料。範例、測試與文件也不得捏造使用者評價、見證、評論或教會個案。

如發現可能的越權、資料外洩、CSV 公式注入、驗證繞過或其他安全問題，請不要建立公開 Issue；請依 [SECURITY.md](SECURITY.md) 私下回報。

## 前端與使用體驗

所有介面文字維持繁體中文，角色名稱保留 `Admin`、`Leader`、`Member`。新增頁面或操作時，應提供清楚的載入、空資料、錯誤與未授權回饋；不要將失敗的查詢呈現為「沒有資料」。對於管理工作區，請維持鍵盤可達性、焦點樣式與小螢幕可讀性。

大型工作區應採路由層級動態載入，避免讓不需要某模組的使用者下載所有管理程式。更動路由或頁面分割後，請以 `pnpm build` 檢查產物與 chunk 體積是否合理。

## 匯入、匯出與檔案

CSV 匯出應維持 UTF-8、公式注入防護與操作稽核。匯入模板只能包含欄位標頭與說明，不能包含虛構或真實資料列。瀏覽器端 CSV 預覽不會把內容送往伺服器；未來若實作真正匯入，必須先提供逐列驗證、可回復錯誤、明確授權與審計紀錄。

照片與文件請使用專案指定的物件儲存流程，資料庫僅保存必要的 URL／key 與 metadata。請勿將大型二進位檔、使用者上傳檔或備份檔直接放入 repository。

## Cloudflare 與部署設定

Cloudflare Edge Gateway 僅快取無 Cookie 的 `/assets/*` 靜態回應；API、OAuth、HTML、含 Cookie 或 `Set-Cookie` 的回應一律不共用快取。若修改 `cloudflare/edge-gateway/`，請閱讀 [掛載與回滾操作手冊](docs/cloudflare-deployment-runbook.md)，並確認 Worker 沒有新增敏感資料快取或將 `APP_ORIGIN` 寫入程式碼。

GitHub 的 Cloudflare deploy workflow 受到 `CLOUDFLARE_DEPLOY_ENABLED` 變數保護。只有帳號擁有人已設定受限 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`APP_ORIGIN` secret 與正式網域後，才可啟用部署；不要在 Pull Request、fork 或公開 log 顯示任何 secret。

## Pull Request 檢核

Pull Request 請使用內建範本，並說明變更目的、資料模型影響、權限影響、測試結果及人工驗證步驟。涉及 UI 時，請說明空資料與行動版結果；涉及資料庫時，請附遷移檔審查摘要；涉及敏感資料時，請指出新增或變更的伺服器端守衛。

PR 合併前，請確認下表所列內容已完成。

| 項目 | 最低要求 |
| --- | --- |
| 品質 | `pnpm check`、`pnpm test` 通過；必要時 `pnpm build` 通過。 |
| 安全 | 無 secret、真實資料、備份、Cookie 或可識別資訊。 |
| 權限 | 已驗證授權與拒絕案例，且敏感資料在伺服器端受限。 |
| 文件 | README、FAQ、操作手冊或 schema 說明已隨行為變更更新。 |
| 可回復性 | 變更資料模型、部署或安全設定時有清楚的回滾說明。 |

## 文件與支援

請把可重複回答的使用問題補進 [FAQ.md](FAQ.md)，把架構或部署決策記錄在 `docs/`。若功能需求依賴真實教會資料，請先在 Issue／PR 說明資料最小化方案，不要要求他人直接公開上傳資料。
