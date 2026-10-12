/* Quote every field; neutralise spreadsheet formula injection (=,+,-,@ prefixes);
   add a BOM so Excel reads UTF-8 names correctly. */
const cell = (v) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export function downloadCSV(filename, rows, columns) {
  const header = columns.map(c => cell(c.label)).join(",");
  const body = rows.map(row => columns.map(c => cell(c.value ? c.value(row) : row[c.key] ?? "")).join(","));
  const csv = "﻿" + [header, ...body].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
