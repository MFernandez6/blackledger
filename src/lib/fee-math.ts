import { FL_PA_CAP_CAT, FL_PA_CAP_STANDARD, STATUTE_CITE } from "@/lib/constants";
import type { ClaimType, FeeScheduleCode } from "@/lib/types";
import { roundCents } from "@/lib/utils";

export type FeeScheduleLike = {
  code: string;
  claimType: string;
  isCatClaim: boolean;
  contingencyPercent: number;
  statutoryCapPercent: number;
};

export type FeeComputation = {
  scheduleCode: FeeScheduleCode;
  percentContracted: number;
  statutoryCapPercent: number;
  percentApplied: number;
  capApplied: boolean;
  feeEarned: number;
  statuteCite: string;
  basis: "settlement" | "demand" | "estimate" | null;
  basisAmount: number | null;
};

export function scheduleCodeFor(
  claimType: ClaimType,
  isCatClaim: boolean
): FeeScheduleCode {
  if (claimType === "PROPERTY" && isCatClaim) return "PROPERTY_CAT";
  if (claimType === "PIP") return "PIP";
  if (claimType === "DENIED_CLAIM") return "DENIED_CLAIM";
  return "PROPERTY";
}

export function statutoryCapFor(isCatClaim: boolean): number {
  return isCatClaim ? FL_PA_CAP_CAT : FL_PA_CAP_STANDARD;
}

export function applyFeeSchedule(opts: {
  settlementAmount?: number | null;
  demandAmount?: number | null;
  estimatedValue?: number | null;
  schedule: FeeScheduleLike;
}): FeeComputation {
  const settlement = opts.settlementAmount ?? null;
  const demand = opts.demandAmount ?? null;
  const estimate = opts.estimatedValue ?? null;
  const basis: FeeComputation["basis"] =
    settlement !== null
      ? "settlement"
      : demand !== null
        ? "demand"
        : estimate !== null
          ? "estimate"
          : null;
  const basisAmount = settlement ?? demand ?? estimate;

  const cap = Math.min(
    opts.schedule.statutoryCapPercent,
    statutoryCapFor(opts.schedule.isCatClaim)
  );
  const contracted = opts.schedule.contingencyPercent;
  const percentApplied = Math.min(contracted, cap);
  const capApplied = contracted > cap;
  const feeEarned =
    basisAmount !== null ? roundCents((basisAmount * percentApplied) / 100) : 0;

  return {
    scheduleCode: opts.schedule.code as FeeScheduleCode,
    percentContracted: contracted,
    statutoryCapPercent: cap,
    percentApplied,
    capApplied,
    feeEarned,
    statuteCite: STATUTE_CITE,
    basis,
    basisAmount,
  };
}

export function partnerSplitAmount(feeEarned: number, splitPercent: number): number {
  return roundCents((feeEarned * splitPercent) / 100);
}

export function firmNet(feeEarned: number, splitTotal: number): number {
  return roundCents(feeEarned - splitTotal);
}
