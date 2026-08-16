import type { ImportTemplateKey } from "./importTemplates";

const rules: Record<ImportTemplateKey, { required: string[]; enums?: Record<string, string[]>; isoDates?: string[]; emails?: string[] }> = {
  groups: { required: ["group_name", "district"], emails: ["leader_email"] },
  group_members: { required: ["group_name", "full_name"], emails: ["email"] },
  meetings: { required: ["group_name", "title", "held_at_iso"], isoDates: ["held_at_iso"] },
  attendance: { required: ["group_name", "meeting_title", "held_at_iso", "member_email", "status"], isoDates: ["held_at_iso"], emails: ["member_email"], enums: { status: ["attended", "absent", "excused"] } },
  care_logs: { required: ["group_name", "member_email", "care_date_iso", "method", "summary", "follow_up_status"], isoDates: ["care_date_iso"], emails: ["member_email"], enums: { method: ["phone", "visit", "message", "meeting", "other"], follow_up_status: ["none", "pending", "completed"] } },
  pastoral_tasks: { required: ["type", "title", "assigned_to_email", "due_at_iso", "priority"], isoDates: ["due_at_iso"], emails: ["assigned_to_email"], enums: { type: ["care_followup", "prayer_followup", "attendance_followup", "general"], priority: ["low", "normal", "high"] } },
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) { const char = text[index]; const next = text[index + 1]; if (char === '"' && quoted && next === '"') { value += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { row.push(value); value = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index += 1; row.push(value); if (row.some(cell => cell.length > 0)) rows.push(row); row = []; value = ""; } else value += char; }
  row.push(value); if (row.some(cell => cell.length > 0)) rows.push(row); return rows;
}

export type CsvImportPreview = { headers: string[]; rows: Record<string, string>[]; errors: string[]; warnings: string[] };

export function validateCsvImport(template: ImportTemplateKey, text: string): CsvImportPreview {
  const errors: string[] = []; const warnings: string[] = []; if (text.length > 2_000_000) return { headers: [], rows: [], errors: ["檔案超過 2MB，本機預覽已停止。"], warnings };
  const matrix = parseCsv(text.replace(/^\uFEFF/, "")); if (!matrix.length) return { headers: [], rows: [], errors: ["找不到 CSV 標頭列。"], warnings };
  const headers = matrix[0].map(cell => cell.trim()); const missing = rules[template].required.filter(column => !headers.includes(column)); if (missing.length) errors.push(`缺少必要欄位：${missing.join("、")}`);
  const dataRows = matrix.slice(1); if (dataRows.length > 5000) errors.push("資料列超過 5,000 列，本機預覽已停止。"); if (!dataRows.length) warnings.push("此檔案目前只有欄位標頭，尚未包含可驗證資料列。");
  const rows = dataRows.slice(0, 5000).map(cells => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()])));
  rows.forEach((row, index) => { const rowNumber = index + 2; rules[template].required.forEach(column => { if (!row[column]) errors.push(`第 ${rowNumber} 列缺少「${column}」。`); }); rules[template].isoDates?.forEach(column => { if (row[column] && Number.isNaN(Date.parse(row[column]))) errors.push(`第 ${rowNumber} 列「${column}」不是有效 ISO 日期。`); }); rules[template].emails?.forEach(column => { if (row[column] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[column])) errors.push(`第 ${rowNumber} 列「${column}」不是有效電子郵件。`); }); Object.entries(rules[template].enums ?? {}).forEach(([column, values]) => { if (row[column] && !values.includes(row[column])) errors.push(`第 ${rowNumber} 列「${column}」必須是：${values.join("、")}。`); }); });
  return { headers, rows, errors: errors.slice(0, 20), warnings };
}
