"use server";

import { revalidatePath } from "next/cache";
import { canEditSchedules, requireSession, resolveSessionStaff } from "@/lib/auth";
import { logLedgerAudit } from "@/lib/actions/audit";
import { statutoryCapFor } from "@/lib/fee-math";
import { prisma } from "@/lib/prisma";
import { updateScheduleSchema } from "@/lib/schemas/payout";

export async function updateFeeScheduleAction(input: unknown) {
  const session = await requireSession();
  const staff = await resolveSessionStaff(session);
  if (!staff || !canEditSchedules(staff.role)) {
    return { ok: false as const, error: "Only ADMIN can edit fee schedules." };
  }

  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid schedule." };

  const current = await prisma.feeSchedule.findUnique({
    where: { id: parsed.data.id },
  });
  if (!current) return { ok: false as const, error: "Schedule not found." };

  const cap = statutoryCapFor(current.isCatClaim);
  if (parsed.data.contingencyPercent > cap) {
    return {
      ok: false as const,
      error: `Fla. Stat. § 626.854(11) caps this schedule at ${cap}%.`,
    };
  }

  await prisma.feeSchedule.update({
    where: { id: current.id },
    data: {
      contingencyPercent: parsed.data.contingencyPercent,
      statutoryCapPercent: cap,
      notes: parsed.data.notes === undefined ? current.notes : parsed.data.notes,
    },
  });

  await logLedgerAudit({
    actorId: staff.id,
    action: "SCHEDULE_UPDATE",
    entityType: "FeeSchedule",
    entityId: current.id,
    summary: `Set ${current.code} contingency to ${parsed.data.contingencyPercent}%`,
  });

  revalidatePath("/schedules");
  revalidatePath("/claims");
  return { ok: true as const };
}
