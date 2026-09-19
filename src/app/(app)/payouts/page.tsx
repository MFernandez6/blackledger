import Link from "next/link";
import { canWriteFinance, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReconciliationQueue } from "@/components/payouts/reconciliation-queue";
import { Button } from "@/components/ui/button";
import { OPEN_PAYOUT_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const session = await getSession();
  const payouts = await prisma.payout.findMany({
    where: { status: { in: [...OPEN_PAYOUT_STATUSES] } },
    include: {
      claim: { select: { primaryClaimant: true } },
      documents: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Reconciliation</p>
          <h1 className="mt-2 font-serif text-3xl text-brand-gold">
            Payout queue
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-white/70">
            Mark disbursed and attach settlement documents. This does not change
            BLACKBOX claim status.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/api/export/payouts">Export CSV</Link>
        </Button>
      </div>

      <ReconciliationQueue
        canWrite={session ? canWriteFinance(session.user.role) : false}
        rows={payouts.map((p) => ({
          id: p.id,
          claimSnapshotId: p.claimSnapshotId,
          claimNumber: p.claimNumber,
          claimant: p.claim.primaryClaimant,
          settlementAmount: p.settlementAmount,
          feeEarned: p.feeEarned,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          notes: p.notes,
          docCount: p.documents.length,
        }))}
      />
    </div>
  );
}
