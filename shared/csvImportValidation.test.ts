import { describe, expect, it } from "vitest";
import { validateCsvImport } from "./csvImportValidation";

describe("本機 CSV 匯入驗證", () => {
  it("接受符合牧養待辦必要欄位與列舉值的資料", () => {
    const text = "type,title,assigned_to_email,due_at_iso,priority\ngeneral,聯絡同工,leader@example.com,2026-08-16T19:30:00+08:00,high";
    const result = validateCsvImport("pastoral_tasks", text);
    expect(result.errors).toEqual([]); expect(result.rows).toHaveLength(1);
  });

  it("回報缺少欄位、錯誤日期與不允許的列舉值", () => {
    const result = validateCsvImport("attendance", "group_name,meeting_title,held_at_iso,member_email,status\n恩典小組,聚會,昨天,not-an-email,unknown");
    expect(result.errors.join(" ")).toContain("不是有效 ISO 日期"); expect(result.errors.join(" ")).toContain("不是有效電子郵件"); expect(result.errors.join(" ")).toContain("必須是");
  });

  it("只含標頭時保留提醒而非建立資料列", () => {
    const result = validateCsvImport("groups", "group_name,district,leader_email,description\n");
    expect(result.rows).toHaveLength(0); expect(result.warnings).toHaveLength(1);
  });
});
