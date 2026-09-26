export function csvCell(value: string | null | undefined): string {
  if (value == null) return '""';
  const safe = /^[\t\r ]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvDocument(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
