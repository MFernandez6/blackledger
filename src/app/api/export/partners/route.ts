import { getSession } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await prisma.partnerSplit.findMany({
    include: {
      partner: true,
      payout: { select: { claimNumber: true, feeEarned: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    [
      "partner",
      "claimNumber",
      "intakeNumber",
      "referralSource",
      "splitPercent",
      "splitAmount",
      "feeEarned",
      "status",
      "paidAt",
    ],
    rows.map((r) => [
      r.partner.name,
      r.payout.claimNumber,
      r.intakeNumber ?? "",
      r.referralSource ?? "",
      r.splitPercent,
      r.splitAmount.toFixed(2),
      r.payout.feeEarned.toFixed(2),
      r.status,
      r.paidAt?.toISOString().slice(0, 10) ?? "",
    ])
  );

  return csvResponse(`blackledger-partners-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
