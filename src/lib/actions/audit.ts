import { prisma } from "@/lib/prisma";

export async function logLedgerAudit(opts: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}) {
  await prisma.ledgerAuditEvent.create({
    data: {
      actorId: opts.actorId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      summary: opts.summary,
    },
  });
}
