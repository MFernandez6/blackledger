import type {
  ClaimStatus,
  ClaimType,
  LossType,
  PayoutStatus,
  SplitStatus,
  StaffRole,
  Timeframe,
} from "@/lib/types";

export const STATUTE_CITE = "Fla. Stat. § 626.854(11)";

export const FL_PA_CAP_STANDARD = 20;
export const FL_PA_CAP_CAT = 10;

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  PROPERTY: "Property",
  PIP: "PIP / auto no-fault",
  DENIED_CLAIM: "Denied claim",
};

export const STATUS_LABELS: Record<ClaimStatus, string> = {
  INTAKE: "Intake",
  UNDER_REVIEW: "Under Review",
  INVESTIGATION: "Investigation",
  FILED: "Filed",
  NEGOTIATING: "Negotiating",
  SETTLED: "Settled",
  CLOSED: "Closed",
  DENIED: "Denied",
};

export const STATUS_BADGE_CLASS: Record<ClaimStatus, string> = {
  INTAKE: "border-brand-white/15 text-brand-white/70",
  UNDER_REVIEW: "border-brand-green/30 text-brand-green-soft",
  INVESTIGATION: "border-brand-green/45 text-brand-green-soft",
  FILED: "border-brand-white/25 text-brand-white",
  NEGOTIATING: "border-brand-green/60 bg-brand-green/10 text-brand-green-soft",
  SETTLED: "border-brand-white/40 text-brand-white",
  CLOSED: "border-brand-white/10 text-brand-slate",
  DENIED: "border-denied/50 bg-denied-muted text-denied-soft",
};

export const LOSS_TYPE_LABELS: Record<LossType, string> = {
  WIND: "Wind",
  FIRE: "Fire",
  WATER: "Water",
  HAIL: "Hail",
  VANDALISM: "Vandalism",
  OTHER: "Other",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DISBURSED: "Disbursed",
  HELD: "Held",
  VOID: "Void",
};

export const PAYOUT_STATUS_CLASS: Record<PayoutStatus, string> = {
  PENDING: "border-brand-white/25 text-brand-white/80",
  APPROVED: "border-brand-green/50 bg-brand-green/10 text-brand-green-soft",
  DISBURSED: "border-brand-green/70 bg-brand-green/15 text-brand-green-soft",
  HELD: "border-brand-gold/50 text-brand-gold",
  VOID: "border-brand-white/10 text-brand-slate",
};

export const SPLIT_STATUS_LABELS: Record<SplitStatus, string> = {
  ACCRUED: "Accrued",
  DUE: "Due",
  PAID: "Paid",
  VOID: "Void",
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Admin",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "1D": "Day",
  "1W": "Week",
  "1M": "Month",
  "1Y": "Year",
  ALL: "All-time",
};

export const TIMEFRAME_TABS: Array<{ id: Timeframe; short: string; label: string }> =
  [
    { id: "1D", short: "1D", label: "Day" },
    { id: "1W", short: "1W", label: "Week" },
    { id: "1M", short: "1M", label: "Month" },
    { id: "1Y", short: "1Y", label: "Year" },
    { id: "ALL", short: "ALL", label: "All-time" },
  ];

export const OPEN_PAYOUT_STATUSES: PayoutStatus[] = [
  "PENDING",
  "APPROVED",
  "HELD",
];
