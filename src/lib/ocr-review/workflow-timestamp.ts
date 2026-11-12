/** Waktu alur SJ di sheet OCR — timezone Jakarta. */
export function ocrWorkflowTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const pad2 = (v: string) => v.padStart(2, "0");
  return `${get("year")}-${get("month")}-${get("day")} ${pad2(get("hour"))}:${pad2(get("minute"))}:${pad2(get("second"))}`;
}
