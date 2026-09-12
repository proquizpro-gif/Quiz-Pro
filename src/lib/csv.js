export function downloadCSV(filename, rows, columns) {
  const header = columns.map(c => JSON.stringify(c.label)).join(",");
  const body = rows.map(row => columns.map(c => {
    const val = c.value ? c.value(row) : row[c.key] ?? "";
    return JSON.stringify(val === null || val === undefined ? "" : val);
  }).join(","));
  const csv = [header, ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
