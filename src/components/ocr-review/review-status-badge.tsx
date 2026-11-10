import {
  ocrReviewStatusLabel,
  ocrReviewStatusTone,
  normalizeOcrReviewStatus,
} from "@/lib/ocr-review/workflow-status";
import { StatusBadge } from "@/components/ui/status-badge";

export function ReviewStatusBadge({ status }: { status: string }) {
  const s = normalizeOcrReviewStatus(status);
  const tone = ocrReviewStatusTone(s);
  const mapped = tone === "neutral" ? "default" : tone;
  return <StatusBadge label={ocrReviewStatusLabel(s)} tone={mapped} />;
}
