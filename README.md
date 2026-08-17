# 恩典同行（Church Care）

**恩典同行**是一套以繁體中文打造的教會管理系統原型，協助教會在尊重資料隱私的前提下，整合宣教士、小組牧養、代禱、關懷、活動、資料治理與保密小組管理。

[![Verify](https://github.com/ludy2099201/mission-group-hub/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ludy2099201/mission-group-hub/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 本專案為可持續擴充的教會行政與牧養工具。請勿將真實會友、關懷、奉獻或登入憑證提交至版本控制系統。

## 功能範圍

| 模組 | 已提供能力 |
| --- | --- |
| 宣教士與支持 | 宣教士名冊、支持承諾、代禱事項、狀態與照片欄位。 |
| 小組牧養 | 小組、成員、聚會、出席率、關懷日誌與牧養待辦。 |
| 活動 | 活動月曆、公告、容量、RSVP、候補與簽到管理。 |
| 人員主檔 | People／Household 中央主檔與小組成員連結。 |
| 資料治理 | CSV 匯出、操作稽核、帳號啟停、真實資料模板與本機 CSV 預覽。 |
| 資料保護 | Admin／Leader／Member 權限、公開／受限／保密小組、最小權限遮罩與保密盤點。 |

## 技術架構

專案使用 React、TypeScript、Tailwind CSS、Express、tRPC、Drizzle ORM 與 MySQL／TiDB 相容資料庫。登入與部署環境採用 Manus 提供的 OAuth、儲存與受管理執行環境；若自行部署，請自行提供等效的驗證、資料庫與祕密管理機制。

## 開始開發

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

開發前請依部署環境建立必要的環境變數。`.env` 與所有本機覆寫檔已列入 `.gitignore`，不得提交 API 金鑰、資料庫連線字串、登入憑證或任何真實教會資料。

| 指令 | 用途 |
| --- | --- |
| `pnpm dev` | 啟動本機開發伺服器。 |
| `pnpm check` | 執行 TypeScript 型別檢查。 |
| `pnpm test` | 執行 Vitest 自動化測試。 |
| `pnpm build` | 建置前端與伺服器產物。 |

專案以 Node.js 22 為基準，`.nvmrc` 可協助本機版本管理工具採用相同執行環境。

## 資料庫變更

資料表定義位於 `drizzle/schema.ts`。變更 schema 後，請產生遷移檔、審閱 SQL，再套用至受控資料庫。進行遷移前，務必確認備份與還原策略；不要用測試資料污染正式教會資料庫。

## 導入真實資料

系統提供僅含欄位標頭的 CSV 模板與瀏覽器端預覽。建議的導入次序如下：

1. 先建立 People／Household 與使用者角色。
2. 匯入小組、帶領人與成員。
3. 匯入聚會、出席、關懷與牧養待辦。
4. 由 Admin、Leader、Member 以真實但最小化資料完成權限驗收。

實際匯入、備份、保留期限與個資告知方式應由各教會依其資料治理政策決定。

## 貢獻與安全

歡迎提出 Issue 或 Pull Request。提交前請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)、[FAQ.md](FAQ.md) 與 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)；GitHub 提供問題回報、功能建議與 Pull Request 範本，提交前 CI 會執行型別檢查、測試與建置。若發現資安或隱私風險，請依 [SECURITY.md](SECURITY.md) 的方式私下回報，請勿在公開 Issue 貼出敏感細節。

## Cloudflare 邊緣部署準備

專案已包含 `cloudflare/edge-gateway` 與受控 GitHub Actions workflow，讓 Cloudflare Worker 可安全前置既有受管理應用：只有無 Cookie 的 `/assets/*` 靜態資產會進行長效邊緣快取；API、OAuth、HTML 與含 Cookie 回應一律不共用快取。實際部署需要由網域與 Cloudflare 帳號擁有人設定受限 API Token、`APP_ORIGIN` secret 及自訂網域，詳見 [掛載與回滾操作手冊](docs/cloudflare-deployment-runbook.md)。

## 授權

本專案採用 [MIT License](LICENSE)。
