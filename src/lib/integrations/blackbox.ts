/**
 * BLACKBOX is the source of truth for claim status and settlement figures.
 * BLACKLEDGER only GETs. There is no write-back client.
 */

import type { ClaimType } from "@/lib/types";

export type BlackboxClaimRecord = {
  id: string;
  claimNumber: string;
  status: string;
  lossType: string;
  isCatClaim: boolean;
  dateOfLoss: string;
  propertyAddress: string;
  county: string;
  zipCode: string;
  carrierName: string | null;
  policyNumber: string | null;
  estimatedValue: number | null;
  demandAmount: number | null;
  settlementAmount: number | null;
  settlementDate: string | null;
  contingencyFeePercent: number;
  assignedAdjuster: string | null;
  primaryClaimant: string;
  intakeNumber?: string | null;
};

export function claimTypeFromLoss(lossType: string, denied: boolean): ClaimType {
  if (denied) return "DENIED_CLAIM";
  if (lossType === "OTHER") return "PROPERTY";
  return "PROPERTY";
}

export async function pullBlackboxClaims(): Promise<
  | { ok: true; dryRun: true; claims: BlackboxClaimRecord[] }
  | { ok: true; dryRun: false; claims: BlackboxClaimRecord[] }
  | { ok: false; error: string }
> {
  const dryRun =
    process.env.BLACKBOX_DRY_RUN === "1" || !process.env.BLACKBOX_API_KEY;
  if (dryRun) {
    return { ok: true, dryRun: true, claims: [] };
  }

  const base = process.env.BLACKBOX_API_URL?.replace(/\/$/, "");
  if (!base) return { ok: false, error: "BLACKBOX_API_URL is not configured." };

  try {
    const res = await fetch(`${base}/api/ledger/claims`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.BLACKBOX_API_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `BLACKBOX ${res.status}: ${text.slice(0, 240)}` };
    }
    const data = (await res.json()) as { claims?: BlackboxClaimRecord[] };
    return { ok: true, dryRun: false, claims: data.claims ?? [] };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "BLACKBOX request failed.",
    };
  }
}
