import { headersToCsv } from "./csv";

export const importTemplateKeys = ["groups", "group_members", "meetings", "attendance", "care_logs", "pastoral_tasks"] as const;
export type ImportTemplateKey = (typeof importTemplateKeys)[number];

const templates: Record<ImportTemplateKey, { label: string; filename: string; columns: string[]; rules: string[] }> = {
  groups: { label: "小組資料", filename: "小組資料_匯入模板.csv", columns: ["group_name", "district", "leader_email", "description"], rules: ["group_name 與 district 必填。", "leader_email 應對應已啟用的 Leader 使用者。"] },
  group_members: { label: "小組成員", filename: "小組成員_匯入模板.csv", columns: ["group_name", "full_name", "email", "phone"], rules: ["group_name 與 full_name 必填。", "建議以 email 或 phone 供後續人員主檔比對。"] },
  meetings: { label: "小組聚會", filename: "小組聚會_匯入模板.csv", columns: ["group_name", "title", "held_at_iso", "notes"], rules: ["group_name、title、held_at_iso 必填。", "held_at_iso 使用 ISO 8601，例如 2026-08-16T19:30:00+08:00。"] },
  attendance: { label: "出席紀錄", filename: "出席紀錄_匯入模板.csv", columns: ["group_name", "meeting_title", "held_at_iso", "member_email", "status"], rules: ["status 僅可填 attended、absent 或 excused。", "應先導入小組、成員與聚會。"] },
  care_logs: { label: "關懷日誌", filename: "關懷日誌_匯入模板.csv", columns: ["group_name", "member_email", "care_date_iso", "method", "summary", "follow_up_status"], rules: ["method 僅可填 phone、visit、message、meeting 或 other。", "follow_up_status 僅可填 none、pending 或 completed。", "勿將高度敏感敘述匯入不受控設備。"] },
  pastoral_tasks: { label: "牧養待辦", filename: "牧養待辦_匯入模板.csv", columns: ["type", "title", "assigned_to_email", "due_at_iso", "priority", "group_name", "member_email", "detail"], rules: ["type 僅可填 care_followup、prayer_followup、attendance_followup 或 general。", "priority 僅可填 low、normal 或 high。", "assigned_to_email 應對應已啟用 Admin 或 Leader。"] },
};

export function getImportTemplate(key: ImportTemplateKey) {
  const template = templates[key];
  return { ...template, key, csv: headersToCsv(template.columns) };
}
