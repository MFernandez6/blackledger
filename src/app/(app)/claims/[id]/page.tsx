import { notFound } from "next/navigation";
import { canWriteFinance, getSession } from "@/lib/auth";
import { applyFeeSchedule, scheduleCodeFor } from "@/lib/fee-math";
import { prisma } from "@/lib/prisma";
import { ClaimFinancialDetail } from "@/components/claims/claim-financial-detail";
import type { ClaimType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClaimFinancePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  const claim = await prisma.claimSnapshot.findUnique({
    where: { id: params.id },
    include: {
      payouts: {
        include: {
          documents: true,
          splits: { include: { partner: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!claim) notFound();

  const code = scheduleCodeFor(claim.claimType as ClaimType, claim.isCatClaim);
  const schedule = await prisma.feeSchedule.findUnique({ where: { code } });
  const fee = applyFeeSchedule({
    settlementAmount: claim.settlementAmount,
    demandAmount: claim.demandAmount,
    estimatedValue: claim.estimatedValue,
    schedule: schedule ?? {
      code,
      claimType: claim.claimType,
      isCatClaim: claim.isCatClaim,
      contingencyPercent: claim.contingencyFeePercent,
      statutoryCapPercent: claim.isCatClaim ? 10 : 20,
    },
  });

  return (
    <ClaimFinancialDetail
      claim={{
        id: claim.id,
        blackboxClaimId: claim.blackboxClaimId,
        claimNumber: claim.claimNumber,
        status: claim.status,
        lossType: claim.lossType,
        claimType: claim.claimType,
        isCatClaim: claim.isCatClaim,
        dateOfLoss: claim.dateOfLoss.toISOString(),
        propertyAddress: claim.propertyAddress,
        county: claim.county,
        zipCode: claim.zipCode,
        carrierName: claim.carrierName,
        policyNumber: claim.policyNumber,
        estimatedValue: claim.estimatedValue,
        demandAmount: claim.demandAmount,
        settlementAmount: claim.settlementAmount,
        settlementDate: claim.settlementDate?.toISOString() ?? null,
        contingencyFeePercent: claim.contingencyFeePercent,
        assignedAdjuster: claim.assignedAdjuster,
        primaryClaimant: claim.primaryClaimant,
        intakeNumber: claim.intakeNumber,
        syncedAt: claim.syncedAt.toISOString(),
      }}
      fee={fee}
      payouts={claim.payouts.map((p) => ({
        id: p.id,
        status: p.status,
        feeEarned: p.feeEarned,
        feePercentApplied: p.feePercentApplied,
        statutoryCapPercent: p.statutoryCapPercent,
        capApplied: p.capApplied,
        settlementAmount: p.settlementAmount,
        disbursementDate: p.disbursementDate?.toISOString() ?? null,
        notes: p.notes,
        documents: p.documents.map((d) => ({
          id: d.id,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
        })),
        splits: p.splits.map((s) => ({
          id: s.id,
          partnerName: s.partner.name,
          splitPercent: s.splitPercent,
          splitAmount: s.splitAmount,
          status: s.status,
        })),
      }))}
      canWrite={session ? canWriteFinance(session.user.role) : false}
    />
  );
}
