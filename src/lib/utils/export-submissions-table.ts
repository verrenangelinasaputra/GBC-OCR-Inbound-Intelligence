import type { SubmissionHistoryRow } from "@/lib/services/ocr-sheet-submissions";

const EXPORT_COLUMNS: { key: keyof SubmissionHistoryRow; label: string }[] = [
  { key: "gudang", label: "Gudang tujuan" },
  { key: "supplier", label: "Supplier" },
  { key: "exportTimestamp", label: "Tanggal Ekspor" },
  { key: "tanggal", label: "Tanggal SJ" },
  { key: "noSuratJalan", label: "No. Surat Jalan" },
  { key: "noKendaraan", label: "No. Kendaraan" },
  { key: "namaBarang", label: "Nama Barang" },
  { key: "jumlah", label: "Jumlah" },
  { key: "status", label: "Status" },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function submissionsTableHtml(
  rows: SubmissionHistoryRow[],
  title: string,
  meta?: string
): string {
  const head = EXPORT_COLUMNS.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((r) => {
      const tds = EXPORT_COLUMNS.map((c) => `<td>${escapeHtml(String(r[c.key] ?? ""))}</td>`).join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  h1 { font-size: 16pt; color: #1e3a5f; }
  p.meta { color: #555; font-size: 9pt; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th { background: #1e3a5f; color: #fff; padding: 8px; text-align: left; }
  td { border: 1px solid #ccc; padding: 6px 8px; }
  tr:nth-child(even) td { background: #f5f7fa; }
</style></head>
<body>
<h1>${escapeHtml(title)}</h1>
${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

export function downloadSubmissionsWord(rows: SubmissionHistoryRow[], fileName: string, meta?: string): void {
  const html = submissionsTableHtml(rows, "Status Pengiriman — GBC", meta);
  const blob = new Blob([`\ufeff${html}`], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
