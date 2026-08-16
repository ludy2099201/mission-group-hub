import { describe, expect, it } from "vitest";
import { rowsToCsv } from "./csv";

describe("CSV 匯出格式", () => {
  it("會轉義逗號、換行與雙引號，並加入 UTF-8 BOM", () => {
    expect(rowsToCsv([{ name: "王小明", note: "關懷,追蹤\n說明\"已更新\"" }])).toBe("\uFEFFname,note\r\n王小明,\"關懷,追蹤\n說明\"\"已更新\"\"\"");
  });

  it("空資料集回傳空內容，不產生無意義的檔案標頭", () => {
    expect(rowsToCsv([])).toBe("");
  });
});
