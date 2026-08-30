import { z } from "zod";
import { PAYOUT_STATUSES, SPLIT_STATUSES } from "@/lib/types";

export const payoutStatusSchema = z.enum(PAYOUT_STATUSES);
export const splitStatusSchema = z.enum(SPLIT_STATUSES);

export const createPayoutSchema = z.object({
  claimSnapshotId: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export const updatePayoutSchema = z.object({
  payoutId: z.string().min(1),
  status: payoutStatusSchema.optional(),
  disbursementDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateSplitSchema = z.object({
  splitId: z.string().min(1),
  status: splitStatusSchema.optional(),
  paidAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const referralTagSchema = z.object({
  intakeNumber: z.string().min(1),
  claimNumber: z.string().nullable().optional(),
  partnerName: z.string().nullable().optional(),
  referringContact: z.string().nullable().optional(),
  feeTerms: z.string().nullable().optional(),
  feePercent: z.number().nullable().optional(),
});

export const updateScheduleSchema = z.object({
  id: z.string().min(1),
  contingencyPercent: z.number().min(0).max(20),
  notes: z.string().max(2000).optional().nullable(),
});
