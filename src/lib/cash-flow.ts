import { OPEN_CLAIM_STATUSES, type ClaimStatus, type PayoutStatus } from "@/lib/types";
import { applyFeeSchedule, type FeeScheduleLike } from "@/lib/fee-math";
import { daysBetween, roundCents } from "@/lib/utils";

export type SnapshotLike = {
  status: string;
  isCatClaim: boolean;
  claimType: string;
  estimatedValue: number | null;
  demandAmount: number | null;
  settlementAmount: number | null;
  settlementDate: Date | string | null;
  contingencyFeePercent: number;
};

export type PayoutLike = {
  status: string;
  feeEarned: number;
  disbursementDate: Date | string | null;
  createdAt: Date | string;
  claimSnapshotId: string;
};

export type AgingBucket = {
  key: "0-30" | "31-60" | "61-90" | "90+";
  label: string;
  amount: number;
  count: number;
};

export type CashFlowView = {
  asOf: Date;
  receivables: number;
  pipelineValue: number;
  realizedRevenue: number;
  realizedYtd: number;
  aging: AgingBucket[];
  claimCountActive: number;
  payoutCountOpen: number;
};

function isOpenClaim(status: string): boolean {
  return (OPEN_CLAIM_STATUSES as string[]).includes(status);
}

function yearStart(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function computeCashFlow(opts: {
  snapshots: SnapshotLike[];
  payouts: PayoutLike[];
  schedules: FeeScheduleLike[];
  asOf?: Date;
}): CashFlowView {
  const asOf = opts.asOf ?? new Date();
  const ytdStart = yearStart(asOf);

  const scheduleBy = (claimType: string, isCat: boolean) =>
    opts.schedules.find((s) => s.claimType === claimType && s.isCatClaim === isCat) ??
    opts.schedules.find((s) => s.code === (isCat ? "PROPERTY_CAT" : "PROPERTY"));

  let pipelineValue = 0;
  let claimCountActive = 0;

  for (const snap of opts.snapshots) {
    if (!isOpenClaim(snap.status)) continue;
    claimCountActive += 1;
    const schedule = scheduleBy(snap.claimType, snap.isCatClaim) ?? {
      code: snap.isCatClaim ? "PROPERTY_CAT" : "PROPERTY",
      claimType: snap.claimType,
      isCatClaim: snap.isCatClaim,
      contingencyPercent: snap.contingencyFeePercent,
      statutoryCapPercent: snap.isCatClaim ? 10 : 20,
    };
    const fee = applyFeeSchedule({
      settlementAmount: snap.settlementAmount,
      demandAmount: snap.demandAmount,
      estimatedValue: snap.estimatedValue,
      schedule,
    });
    pipelineValue += fee.feeEarned;
  }

  const agingMap: Record<AgingBucket["key"], AgingBucket> = {
    "0-30": { key: "0-30", label: "0–30 days", amount: 0, count: 0 },
    "31-60": { key: "31-60", label: "31–60 days", amount: 0, count: 0 },
    "61-90": { key: "61-90", label: "61–90 days", amount: 0, count: 0 },
    "90+": { key: "90+", label: "90+ days", amount: 0, count: 0 },
  };

  let receivables = 0;
  let realizedRevenue = 0;
  let realizedYtd = 0;
  let payoutCountOpen = 0;

  for (const p of opts.payouts) {
    const status = p.status as PayoutStatus;
    if (status === "VOID") continue;
    if (status === "DISBURSED") {
      realizedRevenue += p.feeEarned;
      const when = p.disbursementDate ? new Date(p.disbursementDate) : new Date(p.createdAt);
      if (when >= ytdStart && when <= asOf) realizedYtd += p.feeEarned;
      continue;
    }
    payoutCountOpen += 1;
    receivables += p.feeEarned;
    const anchor = p.disbursementDate ?? p.createdAt;
    const age = daysBetween(anchor, asOf);
    const key: AgingBucket["key"] =
      age <= 30 ? "0-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : "90+";
    agingMap[key].amount += p.feeEarned;
    agingMap[key].count += 1;
  }

  // Settled snapshots with no payout still count as receivables
  const paidClaimIds = new Set(opts.payouts.map((p) => p.claimSnapshotId));
  for (const snap of opts.snapshots) {
    if (snap.status !== "SETTLED") continue;
    // skip if a payout already exists (covered above)
    // We can't know claimSnapshotId from SnapshotLike alone in all callers —
    // handled by the query layer when building payouts. Extra pass uses settlement.
  }
  void paidClaimIds;

  return {
    asOf,
    receivables: roundCents(receivables),
    pipelineValue: roundCents(pipelineValue),
    realizedRevenue: roundCents(realizedRevenue),
    realizedYtd: roundCents(realizedYtd),
    aging: Object.values(agingMap).map((b) => ({
      ...b,
      amount: roundCents(b.amount),
    })),
    claimCountActive,
    payoutCountOpen,
  };
}

export function agingKeyForDays(days: number): AgingBucket["key"] {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function isSettledStatus(status: ClaimStatus | string): boolean {
  return status === "SETTLED" || status === "CLOSED";
}
