import { getSession } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await prisma.payout.findMany({
    include: { claim: { select: { primaryClaimant: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    [
      "claimNumber",
      "claimant",
      "claimStatus",
      "payoutStatus",
      "settlementAmount",
      "feePercentApplied",
      "feeEarned",
      "statutoryCapPercent",
      "capApplied",
      "disbursementDate",
      "notes",
    ],
    rows.map((r) => [
      r.claimNumber,
      r.claim.primaryClaimant,
      r.claim.status,
      r.status,
      r.settlementAmount.toFixed(2),
      r.feePercentApplied,
      r.feeEarned.toFixed(2),
      r.statutoryCapPercent,
      r.capApplied ? "yes" : "no",
      r.disbursementDate?.toISOString().slice(0, 10) ?? "",
      r.notes ?? "",
    ])
  );

  return csvResponse(`blackledger-payouts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
