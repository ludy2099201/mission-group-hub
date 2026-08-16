import { describe, expect, it } from "vitest";
import { getImportTemplate, importTemplateKeys } from "./importTemplates";

describe("真實資料匯入模板", () => {
  it("每個模板只產生 UTF-8 BOM 標頭，不寫入虛構資料列", () => {
    importTemplateKeys.forEach(key => {
      const template = getImportTemplate(key);
      expect(template.csv.startsWith("\uFEFF")).toBe(true);
      expect(template.csv.trim().split("\n")).toHaveLength(1);
      expect(template.columns.length).toBeGreaterThan(1);
    });
  });

  it("待辦模板包含責任人、到期日與優先級欄位", () => {
    expect(getImportTemplate("pastoral_tasks").columns).toEqual(expect.arrayContaining(["assigned_to_email", "due_at_iso", "priority"]));
  });
});
