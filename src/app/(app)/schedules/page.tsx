import { canEditSchedules, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleTable } from "@/components/schedules/schedule-table";
import { STATUTE_CITE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await getSession();
  const rows = await prisma.feeSchedule.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Florida public adjuster</p>
        <h1 className="mt-2 font-serif text-2xl tracking-[0.12em] text-brand-white">
          Fee schedules
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-white/70">
          Contingency percentages by claim type. The application will not save a
          contracted rate above the statutory cap in {STATUTE_CITE}: 10% on
          Governor-declared emergency losses, 20% on all other claims.
        </p>
      </div>
      <ScheduleTable
        canEdit={session ? canEditSchedules(session.user.role) : false}
        rows={rows}
      />
    </div>
  );
}
