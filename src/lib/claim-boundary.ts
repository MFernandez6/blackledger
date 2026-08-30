/**
 * BLACKLEDGER may overlay a financial layer on a claim. It must never
 * mutate BLACKBOX claim status. Enforce that at the API / action layer.
 */

const FORBIDDEN_CLAIM_FIELDS = [
  "status",
  "claimStatus",
  "newStatus",
  "previousStatus",
  "claim_status",
] as const;

export class ClaimBoundaryError extends Error {
  constructor(message = "Claim status is owned by BLACKBOX and cannot be written from BLACKLEDGER.") {
    super(message);
    this.name = "ClaimBoundaryError";
  }
}

export function assertNoClaimStatusMutation(body: unknown): void {
  if (!body || typeof body !== "object") return;
  const record = body as Record<string, unknown>;
  for (const key of FORBIDDEN_CLAIM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      throw new ClaimBoundaryError(
        `Rejected write: '${key}' is a claim-status field. BLACKLEDGER cannot change claim status.`
      );
    }
  }
}

export function stripClaimStatus<T extends Record<string, unknown>>(body: T): Omit<T, (typeof FORBIDDEN_CLAIM_FIELDS)[number]> {
  const next = { ...body };
  for (const key of FORBIDDEN_CLAIM_FIELDS) {
    delete next[key];
  }
  return next;
}

/** Fields a BLACKBOX sync is allowed to persist onto ClaimSnapshot. */
export const SNAPSHOT_WRITE_FIELDS = [
  "blackboxClaimId",
  "claimNumber",
  "status",
  "lossType",
  "claimType",
  "isCatClaim",
  "dateOfLoss",
  "propertyAddress",
  "county",
  "zipCode",
  "carrierName",
  "policyNumber",
  "estimatedValue",
  "demandAmount",
  "settlementAmount",
  "settlementDate",
  "contingencyFeePercent",
  "assignedAdjuster",
  "primaryClaimant",
  "intakeNumber",
  "syncedAt",
] as const;
