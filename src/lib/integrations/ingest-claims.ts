import { persistCashFlowSnapshot } from "@/lib/actions/snapshots";
import { claimTypeFromLoss, pullBlackboxClaims } from "@/lib/integrations/blackbox";
import { pullBlackgatePartners } from "@/lib/integrations/blackgate";
import { prisma } from "@/lib/prisma";

export type IngestResult =
  | {
      ok: true;
      dryRun: boolean;
      pulled: number;
      partners: number;
      source: "database" | "http" | "dry-run";
    }
  | { ok: false; error: string };

const STALE_MS = 20_000;

export async function ingestSuiteClaims(): Promise<IngestResult> {
  const remote = await pullBlackboxClaims();
  if (!remote.ok) return remote;

  if (remote.dryRun) {
    return { ok: true, dryRun: true, pulled: 0, partners: 0, source: "dry-run" };
  }

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
  if (partnersRemote.ok && !partnersRemote.dryRun) {
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

  return {
    ok: true,
    dryRun: false,
    pulled,
    partners,
    source: remote.source,
  };
}

export async function refreshSuiteClaimsIfStale(): Promise<IngestResult | null> {
  const latest = await prisma.claimSnapshot.findFirst({
    orderBy: { syncedAt: "desc" },
    select: { syncedAt: true },
  });
  const stale =
    !latest || Date.now() - latest.syncedAt.getTime() > STALE_MS;
  if (!stale) return null;
  return ingestSuiteClaims();
}
