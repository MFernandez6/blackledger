import { buildChartSeries, payoutsToEvents } from "@/lib/chart-buckets";
import { computeCashFlow } from "@/lib/cash-flow";
import { prisma } from "@/lib/prisma";
import type { Timeframe } from "@/lib/types";

export async function loadDashboard(timeframe: Timeframe = "1M") {
  const [snapshots, payouts, schedules, partners, splits] = await Promise.all([
    prisma.claimSnapshot.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payout.findMany({
      include: {
        claim: { select: { primaryClaimant: true, status: true, county: true } },
        splits: { include: { partner: true } },
        documents: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feeSchedule.findMany({ where: { isActive: true } }),
    prisma.partner.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.partnerSplit.findMany({
      include: {
        partner: true,
        payout: { select: { claimNumber: true, feeEarned: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cash = computeCashFlow({ snapshots, payouts, schedules });
  const events = payoutsToEvents(payouts);
  const series = buildChartSeries(events, timeframe);

  return { snapshots, payouts, schedules, partners, splits, cash, series };
}
