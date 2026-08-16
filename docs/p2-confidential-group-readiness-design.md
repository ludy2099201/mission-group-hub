# P2 保密小組盤點設計

| 指標 | 唯讀判定 | Admin 回應 |
| --- | --- | --- |
| 保密等級摘要 | 計算 public、restricted、confidential 小組數。 | 定期確認公開小組的說明內容適合所有 Member 瀏覽。 |
| 未指派帶領人 | `restricted` 或 `confidential` 小組沒有 Leader。 | 立即指定負責 Leader，或暫停該小組。 |
| 保密公開面 | 所有 `public` 小組皆列入提醒，因 Member 可讀取其基本資料。 | 檢視名稱、牧區與公開說明，不放入關懷、出席或成員內容。 |
| 已停用保密小組 | inactive 且 confidentiality 為 restricted／confidential。 | 決定是否保留、封存或移轉資料；本輪僅提示，不做自動刪除。 |

此盤點只讀取小組狀態、帶領人指派與保密等級，不讀取成員名冊、出席或關懷內容，也不會改寫任何資料。
