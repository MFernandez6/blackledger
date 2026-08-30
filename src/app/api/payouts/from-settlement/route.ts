import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isServiceKey } from "@/lib/auth";
import { logLedgerAudit } from "@/lib/actions/audit";
import { applyFeeSchedule, partnerSplitAmount, scheduleCodeFor } from "@/lib/fee-math";
import { prisma } from "@/lib/prisma";
import type { ClaimType } from "@/lib/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  claimNumber: z.string().min(1),
  blackboxClaimId: z.string().min(1).optional(),
  settlementAmount: z.number().positive().nullable().optional(),
  settlementDate: z.string().nullable().optional(),
  generatedDocumentId: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Inbound from BLACKLETTER when a settlement / release is executed.
 * Opens a payout in the disbursement queue. Never writes claim status.
 */
export async function POST(req: NextRequest) {
  if (!isServiceKey(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settlement payload." }, { status: 400 });
  }

  const actor = await prisma.staff.findFirst({
    where: { isActive: true, role: { in: ["ADMIN", "FINANCE"] } },
  });
  if (!actor) {
    return NextResponse.json({ error: "No finance staff to record payout." }, { status: 500 });
  }

  let claim = parsed.data.blackboxClaimId
    ? await prisma.claimSnapshot.findUnique({
        where: { blackboxClaimId: parsed.data.blackboxClaimId },
      })
    : null;
  if (!claim) {
    claim = await prisma.claimSnapshot.findUnique({
      where: { claimNumber: parsed.data.claimNumber },
    });
  }

  if (claim && parsed.data.settlementAmount != null) {
    claim = await prisma.claimSnapshot.update({
      where: { id: claim.id },
      data: {
        settlementAmount: parsed.data.settlementAmount,
        settlementDate: parsed.data.settlementDate
          ? new Date(parsed.data.settlementDate)
          : claim.settlementDate,
      },
    });
  }

  if (!claim) {
    return NextResponse.json(
      { error: "Claim snapshot not found. Sync BLACKBOX into BLACKLEDGER first." },
      { status: 404 }
    );
  }

  const existing = await prisma.payout.findFirst({
    where: { claimSnapshotId: claim.id, status: { not: "VOID" } },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      payoutId: existing.id,
      alreadyOpen: true,
    });
  }

  if (!claim.settlementAmount) {
    return NextResponse.json(
      { error: "No settlement amount on the claim snapshot." },
      { status: 400 }
    );
  }

  const code = scheduleCodeFor(claim.claimType as ClaimType, claim.isCatClaim);
  const schedule = await prisma.feeSchedule.findUnique({ where: { code } });
  if (!schedule) {
    return NextResponse.json({ error: "Fee schedule missing." }, { status: 500 });
  }

  const fee = applyFeeSchedule({
    settlementAmount: claim.settlementAmount,
    demandAmount: claim.demandAmount,
    estimatedValue: claim.estimatedValue,
    schedule,
  });

  const payout = await prisma.payout.create({
    data: {
      claimSnapshotId: claim.id,
      claimNumber: claim.claimNumber,
      settlementAmount: claim.settlementAmount,
      feePercentApplied: fee.percentApplied,
      feeEarned: fee.feeEarned,
      statutoryCapPercent: fee.statutoryCapPercent,
      capApplied: fee.capApplied,
      status: "PENDING",
      notes:
        parsed.data.notes ??
        `Opened from BLACKLETTER ${parsed.data.generatedDocumentId ?? "settlement document"}`,
      recordedById: actor.id,
    },
  });

  const tag = claim.intakeNumber
    ? await prisma.referralTag.findFirst({
        where: { intakeNumber: claim.intakeNumber },
        orderBy: { receivedAt: "desc" },
      })
    : await prisma.referralTag.findFirst({
        where: { claimNumber: claim.claimNumber },
        orderBy: { receivedAt: "desc" },
      });

  if (tag?.partnerName && tag.feePercent && tag.feePercent > 0) {
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { name: tag.partnerName },
          { slug: tag.partnerName.toLowerCase().replace(/\s+/g, "-") },
        ],
      },
    });
    if (partner) {
      await prisma.partnerSplit.create({
        data: {
          payoutId: payout.id,
          partnerId: partner.id,
          intakeNumber: tag.intakeNumber,
          referralSource: partner.sourceSlug,
          referringContact: tag.referringContact,
          splitPercent: tag.feePercent,
          splitAmount: partnerSplitAmount(fee.feeEarned, tag.feePercent),
          status: "ACCRUED",
          notes: tag.feeTerms,
        },
      });
    }
  }

  await logLedgerAudit({
    actorId: actor.id,
    action: "PAYOUT_CREATE",
    entityType: "Payout",
    entityId: payout.id,
    summary: `BLACKLETTER opened payout on ${claim.claimNumber} for ${fee.feeEarned.toFixed(2)}`,
  });

  return NextResponse.json({ ok: true, payoutId: payout.id });
}
