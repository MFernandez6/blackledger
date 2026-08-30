export const STAFF_ROLES = ["ADMIN", "FINANCE", "VIEWER"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const CLAIM_TYPES = ["PROPERTY", "PIP", "DENIED_CLAIM"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = [
  "INTAKE",
  "UNDER_REVIEW",
  "INVESTIGATION",
  "FILED",
  "NEGOTIATING",
  "SETTLED",
  "CLOSED",
  "DENIED",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const LOSS_TYPES = [
  "WIND",
  "FIRE",
  "WATER",
  "HAIL",
  "VANDALISM",
  "OTHER",
] as const;
export type LossType = (typeof LOSS_TYPES)[number];

export const PAYOUT_STATUSES = [
  "PENDING",
  "APPROVED",
  "DISBURSED",
  "HELD",
  "VOID",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const SPLIT_STATUSES = ["ACCRUED", "DUE", "PAID", "VOID"] as const;
export type SplitStatus = (typeof SPLIT_STATUSES)[number];

export const FEE_SCHEDULE_CODES = [
  "PROPERTY",
  "PROPERTY_CAT",
  "PIP",
  "DENIED_CLAIM",
] as const;
export type FeeScheduleCode = (typeof FEE_SCHEDULE_CODES)[number];

export const TIMEFRAMES = ["1D", "1W", "1M", "1Y", "ALL"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const OPEN_CLAIM_STATUSES: ClaimStatus[] = [
  "INTAKE",
  "UNDER_REVIEW",
  "INVESTIGATION",
  "FILED",
  "NEGOTIATING",
];

export const TERMINAL_CLAIM_STATUSES: ClaimStatus[] = [
  "SETTLED",
  "CLOSED",
  "DENIED",
];
