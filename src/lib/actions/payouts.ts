"use server";

import { revalidatePath } from "next/cache";
import { canWriteFinance, requireSession, resolveSessionStaff } from "@/lib/auth";
import { assertNoClaimStatusMutation } from "@/lib/claim-boundary";
import { applyFeeSchedule, partnerSplitAmount, scheduleCodeFor } from "@/lib/fee-math";
import { prisma } from "@/lib/prisma";
import {
  createPayoutSchema,
  updatePayoutSchema,
  updateSplitSchema,
} from "@/lib/schemas/payout";
import type { ClaimType } from "@/lib/types";
import { logLedgerAudit } from "@/lib/actions/audit";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireFinance() {
  const session = await requireSession();
  const staff = await resolveSessionStaff(session);
  if (!staff) return { ok: false as const, error: "UNAUTHORIZED" };
  if (!canWriteFinance(staff.role)) {
    return { ok: false as const, error: "Finance write requires ADMIN or FINANCE." };
  }
  return { ok: true as const, staff };
}

export async function createPayoutAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    assertNoClaimStatusMutation(input);
    const auth = await requireFinance();
    if (!auth.ok) return { ok: false, error: auth.error };
    const parsed = createPayoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid payout payload." };

    const claim = await prisma.claimSnapshot.findUnique({
      where: { id: parsed.data.claimSnapshotId },
    });
    if (!claim) return { ok: false, error: "Claim snapshot not found." };
    if (!claim.settlementAmount) {
      return { ok: false, error: "BLACKBOX has no settlement amount on this file." };
    }

    const existing = await prisma.payout.findFirst({
      where: { claimSnapshotId: claim.id, status: { not: "VOID" } },
    });
    if (existing) {
      return { ok: false, error: "An open payout already exists for this claim." };
    }

    const code = scheduleCodeFor(claim.claimType as ClaimType, claim.isCatClaim);
    const schedule = await prisma.feeSchedule.findUnique({ where: { code } });
    if (!schedule) return { ok: false, error: "Fee schedule missing." };

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
        notes: parsed.data.notes,
        recordedById: auth.staff.id,
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
      actorId: auth.staff.id,
      action: "PAYOUT_CREATE",
      entityType: "Payout",
      entityId: payout.id,
      summary: `Opened payout on ${claim.claimNumber} for ${fee.feeEarned.toFixed(2)}`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/payouts");
    revalidatePath(`/claims/${claim.id}`);
    return { ok: true, data: { id: payout.id } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Payout create failed.",
    };
  }
}

export async function updatePayoutAction(
  input: unknown
): Promise<ActionResult> {
  try {
    assertNoClaimStatusMutation(input);
    const auth = await requireFinance();
    if (!auth.ok) return { ok: false, error: auth.error };
    const parsed = updatePayoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid payout update." };

    const current = await prisma.payout.findUnique({
      where: { id: parsed.data.payoutId },
    });
    if (!current) return { ok: false, error: "Payout not found." };

    const nextStatus = parsed.data.status ?? current.status;
    let disbursementDate = current.disbursementDate;
    if (parsed.data.disbursementDate !== undefined) {
      disbursementDate = parsed.data.disbursementDate
        ? new Date(parsed.data.disbursementDate)
        : null;
    }
    if (nextStatus === "DISBURSED" && !disbursementDate) {
      disbursementDate = new Date();
    }

    await prisma.payout.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        disbursementDate,
        notes:
          parsed.data.notes === undefined ? current.notes : parsed.data.notes,
      },
    });

    if (nextStatus === "DISBURSED") {
      await prisma.partnerSplit.updateMany({
        where: { payoutId: current.id, status: { in: ["ACCRUED", "DUE"] } },
        data: { status: "DUE" },
      });
    }

    await logLedgerAudit({
      actorId: auth.staff.id,
      action: "PAYOUT_UPDATE",
      entityType: "Payout",
      entityId: current.id,
      summary: `Updated payout ${current.claimNumber} → ${nextStatus}`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/payouts");
    revalidatePath("/partners");
    revalidatePath(`/claims/${current.claimSnapshotId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Payout update failed.",
    };
  }
}

export async function updateSplitAction(
  input: unknown
): Promise<ActionResult> {
  try {
    assertNoClaimStatusMutation(input);
    const auth = await requireFinance();
    if (!auth.ok) return { ok: false, error: auth.error };
    const parsed = updateSplitSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid split update." };

    const current = await prisma.partnerSplit.findUnique({
      where: { id: parsed.data.splitId },
    });
    if (!current) return { ok: false, error: "Split not found." };

    const nextStatus = parsed.data.status ?? current.status;
    let paidAt = current.paidAt;
    if (parsed.data.paidAt !== undefined) {
      paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : null;
    }
    if (nextStatus === "PAID" && !paidAt) paidAt = new Date();

    await prisma.partnerSplit.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        paidAt,
        notes: parsed.data.notes === undefined ? current.notes : parsed.data.notes,
      },
    });

    await logLedgerAudit({
      actorId: auth.staff.id,
      action: "SPLIT_UPDATE",
      entityType: "PartnerSplit",
      entityId: current.id,
      summary: `Updated partner split → ${nextStatus}`,
    });

    revalidatePath("/partners");
    revalidatePath("/payouts");
    return { ok: true, data: undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Split update failed.",
    };
  }
}
