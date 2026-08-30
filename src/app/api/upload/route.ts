import { NextRequest, NextResponse } from "next/server";
import { canWriteFinance, getSession, resolveSessionStaff } from "@/lib/auth";
import { logLedgerAudit } from "@/lib/actions/audit";
import { prisma } from "@/lib/prisma";
import { storePayoutDocument } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || !canWriteFinance(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const staff = await resolveSessionStaff(session);
  if (!staff) {
    return NextResponse.json({ error: "Session is stale. Sign in again." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const payoutId = String(form.get("payoutId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!payoutId) {
    return NextResponse.json({ error: "payoutId required." }, { status: 400 });
  }

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return NextResponse.json({ error: "Payout not found." }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storePayoutDocument({
    payoutId,
    fileName: file.name,
    bytes,
  });

  const doc = await prisma.payoutDocument.create({
    data: {
      payoutId,
      fileName: file.name,
      fileUrl: stored.fileUrl,
      fileSizeBytes: bytes.length,
      mimeType: file.type || "application/octet-stream",
      uploadedById: staff.id,
    },
  });

  await logLedgerAudit({
    actorId: staff.id,
    action: "PAYOUT_DOC_UPLOAD",
    entityType: "PayoutDocument",
    entityId: doc.id,
    summary: `Attached ${file.name} to ${payout.claimNumber}`,
  });

  return NextResponse.json({ ok: true, id: doc.id, fileUrl: stored.fileUrl });
}
