export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const normalized = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const lines = [columns.map(escapeCsvValue).join(",")];
  rows.forEach(row => lines.push(columns.map(column => escapeCsvValue(row[column])).join(",")));
  return `\uFEFF${lines.join("\r\n")}`;
}

export function headersToCsv(columns: string[]): string {
  return `\uFEFF${columns.map(escapeCsvValue).join(",")}\r\n`;
}
