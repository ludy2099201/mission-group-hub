# P2 保密小組與敏感資料存取設計

| 保密等級 | 可見小組基本資料 | 可見名冊、出席、關懷與待辦 | 設定者 |
| --- | --- | --- | --- |
| `public` | Admin、Leader、Member 可見名稱、牧區與公開說明。 | 僅 Admin 與該小組 Leader 可見。 | Admin |
| `restricted` | Admin 與該小組 Leader 可見。 | 僅 Admin 與該小組 Leader 可見。 | Admin |
| `confidential` | Admin 與該小組 Leader 可見，並在清單清楚標記為保密。 | 僅 Admin 與該小組 Leader 可見；不在 Member 任何清單中出現。 | Admin |

現有小組預設為 `restricted`，因此不會因功能上線而擴大資料曝光。所有名冊、出席、關懷、牧養待辦的詳細資料仍由伺服器端 `requireOwnedGroup` 限制；前端隱藏僅用於改善使用者體驗，不能視為安全機制。Member 僅可取得 `public` 小組的低敏感度基本資料，且不會取得小組成員、聯絡方式、出席或關懷內容。

保密等級變更需寫入操作稽核。未授權使用者會收到清楚的拒絕訊息，而不是空白頁或假性資料。 
