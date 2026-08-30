import { Badge } from "@/components/ui/badge";
import {
  PAYOUT_STATUS_CLASS,
  PAYOUT_STATUS_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from "@/lib/constants";
import type { ClaimStatus, PayoutStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClaimStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status as ClaimStatus;
  return (
    <Badge className={cn(STATUS_BADGE_CLASS[key] ?? "border-brand-white/15 text-brand-white/70", className)}>
      {STATUS_LABELS[key] ?? status}
    </Badge>
  );
}

export function PayoutStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status as PayoutStatus;
  return (
    <Badge className={cn(PAYOUT_STATUS_CLASS[key] ?? "border-brand-white/15", className)}>
      {PAYOUT_STATUS_LABELS[key] ?? status}
    </Badge>
  );
}
