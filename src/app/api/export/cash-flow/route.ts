import { computeCashFlow } from "@/lib/cash-flow";
import { getSession } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [snapshots, payouts, schedules] = await Promise.all([
    prisma.claimSnapshot.findMany(),
    prisma.payout.findMany(),
    prisma.feeSchedule.findMany({ where: { isActive: true } }),
  ]);
  const cash = computeCashFlow({ snapshots, payouts, schedules });

  const csv = toCsv(
    ["metric", "amount"],
    [
      ["asOf", cash.asOf.toISOString()],
      ["pipelineValue", cash.pipelineValue.toFixed(2)],
      ["realizedYtd", cash.realizedYtd.toFixed(2)],
      ["realizedRevenue", cash.realizedRevenue.toFixed(2)],
      ["receivables", cash.receivables.toFixed(2)],
      ["aging_0_30", cash.aging[0]?.amount.toFixed(2) ?? "0"],
      ["aging_31_60", cash.aging[1]?.amount.toFixed(2) ?? "0"],
      ["aging_61_90", cash.aging[2]?.amount.toFixed(2) ?? "0"],
      ["aging_90_plus", cash.aging[3]?.amount.toFixed(2) ?? "0"],
      ["activeClaims", cash.claimCountActive],
      ["openPayouts", cash.payoutCountOpen],
    ]
  );

  return csvResponse(`blackledger-cashflow-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
