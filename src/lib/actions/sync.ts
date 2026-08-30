"use server";

import { revalidatePath } from "next/cache";
import { canWriteFinance, requireSession, resolveSessionStaff } from "@/lib/auth";
import { persistCashFlowSnapshot } from "@/lib/actions/snapshots";
import { logLedgerAudit } from "@/lib/actions/audit";
import { claimTypeFromLoss, pullBlackboxClaims } from "@/lib/integrations/blackbox";
import { pullBlackgatePartners } from "@/lib/integrations/blackgate";
import { prisma } from "@/lib/prisma";

export type SyncResult =
  | { ok: true; dryRun: boolean; pulled: number; partners: number }
  | { ok: false; error: string };

export async function syncFromBlackboxAction(): Promise<SyncResult> {
  try {
    const session = await requireSession();
    const staff = await resolveSessionStaff(session);
    if (!staff || !canWriteFinance(staff.role)) {
      return { ok: false, error: "Sync requires ADMIN or FINANCE." };
    }

    const remote = await pullBlackboxClaims();
    if (!remote.ok) return remote;

    let pulled = 0;
    for (const claim of remote.claims) {
      const denied = claim.status === "DENIED";
      await prisma.claimSnapshot.upsert({
        where: { blackboxClaimId: claim.id },
        create: {
          blackboxClaimId: claim.id,
          claimNumber: claim.claimNumber,
          status: claim.status,
          lossType: claim.lossType,
          claimType: claimTypeFromLoss(claim.lossType, denied),
          isCatClaim: claim.isCatClaim,
          dateOfLoss: new Date(claim.dateOfLoss),
          propertyAddress: claim.propertyAddress,
          county: claim.county,
          zipCode: claim.zipCode,
          carrierName: claim.carrierName,
          policyNumber: claim.policyNumber,
          estimatedValue: claim.estimatedValue,
          demandAmount: claim.demandAmount,
          settlementAmount: claim.settlementAmount,
          settlementDate: claim.settlementDate ? new Date(claim.settlementDate) : null,
          contingencyFeePercent: claim.contingencyFeePercent,
          assignedAdjuster: claim.assignedAdjuster,
          primaryClaimant: claim.primaryClaimant,
          intakeNumber: claim.intakeNumber ?? null,
          syncedAt: new Date(),
        },
        update: {
          claimNumber: claim.claimNumber,
          status: claim.status,
          lossType: claim.lossType,
          claimType: claimTypeFromLoss(claim.lossType, denied),
          isCatClaim: claim.isCatClaim,
          dateOfLoss: new Date(claim.dateOfLoss),
          propertyAddress: claim.propertyAddress,
          county: claim.county,
          zipCode: claim.zipCode,
          carrierName: claim.carrierName,
          policyNumber: claim.policyNumber,
          estimatedValue: claim.estimatedValue,
          demandAmount: claim.demandAmount,
          settlementAmount: claim.settlementAmount,
          settlementDate: claim.settlementDate ? new Date(claim.settlementDate) : null,
          contingencyFeePercent: claim.contingencyFeePercent,
          assignedAdjuster: claim.assignedAdjuster,
          primaryClaimant: claim.primaryClaimant,
          intakeNumber: claim.intakeNumber ?? null,
          syncedAt: new Date(),
        },
      });
      pulled += 1;
    }

    const partnersRemote = await pullBlackgatePartners();
    let partners = 0;
    if (partnersRemote.ok) {
      for (const p of partnersRemote.partners) {
        await prisma.partner.upsert({
          where: { slug: p.slug },
          create: {
            slug: p.slug,
            name: p.name,
            brand: p.brand ?? null,
            sourceSlug: p.sourceSlug ?? null,
            defaultSplitPercent: p.defaultSplitPercent ?? 0,
          },
          update: {
            name: p.name,
            brand: p.brand ?? null,
            sourceSlug: p.sourceSlug ?? null,
            defaultSplitPercent: p.defaultSplitPercent ?? undefined,
          },
        });
        partners += 1;
      }
    }

    await persistCashFlowSnapshot();

    await logLedgerAudit({
      actorId: staff.id,
      action: "BLACKBOX_SYNC",
      entityType: "ClaimSnapshot",
      summary: remote.dryRun
        ? "BLACKBOX dry-run — local snapshots unchanged."
        : `Pulled ${pulled} claim snapshots from BLACKBOX.`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/claims");
    revalidatePath("/payouts");
    return { ok: true, dryRun: remote.dryRun, pulled, partners };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed.",
    };
  }
}
