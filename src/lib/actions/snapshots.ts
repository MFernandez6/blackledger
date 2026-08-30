import { computeCashFlow } from "@/lib/cash-flow";
import { prisma } from "@/lib/prisma";

export async function persistCashFlowSnapshot() {
  const [snapshots, payouts, schedules] = await Promise.all([
    prisma.claimSnapshot.findMany(),
    prisma.payout.findMany(),
    prisma.feeSchedule.findMany({ where: { isActive: true } }),
  ]);

  const view = computeCashFlow({ snapshots, payouts, schedules });

  return prisma.cashFlowSnapshot.create({
    data: {
      asOf: view.asOf,
      receivables: view.receivables,
      pipelineValue: view.pipelineValue,
      realizedRevenue: view.realizedRevenue,
      realizedYtd: view.realizedYtd,
      aging030: view.aging[0]?.amount ?? 0,
      aging3160: view.aging[1]?.amount ?? 0,
      aging6190: view.aging[2]?.amount ?? 0,
      aging90plus: view.aging[3]?.amount ?? 0,
      claimCountActive: view.claimCountActive,
      payoutCountOpen: view.payoutCountOpen,
    },
  });
}
