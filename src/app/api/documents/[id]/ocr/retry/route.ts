import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { enqueueOcrJob } from "@/lib/services/ocr-pipeline";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiPermission("ocr_review", "EDIT");
    const { id } = await context.params;
    const job = await enqueueOcrJob(id, session.userId, { waitForCompletion: false });
    return Response.json({ ok: true, jobId: job.id, status: job.status });
  } catch (e) {
    return jsonError(e);
  }
}
