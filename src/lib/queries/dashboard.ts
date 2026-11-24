import { buildChartSeries, payoutsToEvents } from "@/lib/chart-buckets";
import { computeCashFlow } from "@/lib/cash-flow";
import { refreshSuiteClaimsIfStale } from "@/lib/integrations/ingest-claims";
import { prisma } from "@/lib/prisma";
import type { Timeframe } from "@/lib/types";

export async function loadDashboard(timeframe: Timeframe = "1M") {
  await refreshSuiteClaimsIfStale();
  // Cash-flow totals need every snapshot and payout. The files and payout
  // screens page their own lists. Do not add take() here.
  const [snapshots, payouts, schedules, splits] = await Promise.all([
    prisma.claimSnapshot.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        primaryClaimant: true,
        status: true,
        isCatClaim: true,
        claimType: true,
        estimatedValue: true,
        demandAmount: true,
        settlementAmount: true,
        settlementDate: true,
        contingencyFeePercent: true,
        updatedAt: true,
      },
    }),
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        feeEarned: true,
        disbursementDate: true,
        createdAt: true,
        claimSnapshotId: true,
      },
    }),
    prisma.feeSchedule.findMany({
      where: { isActive: true },
      select: {
        code: true,
        claimType: true,
        isCatClaim: true,
        contingencyPercent: true,
        statutoryCapPercent: true,
      },
    }),
    prisma.partnerSplit.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        splitAmount: true,
        partner: { select: { name: true } },
        payout: { select: { claimNumber: true } },
      },
    }),
  ]);

  const cash = computeCashFlow({ snapshots, payouts, schedules });
  const events = payoutsToEvents(payouts);
  const series = buildChartSeries(events, timeframe);

  return { snapshots, payouts, splits, cash, series };
}
