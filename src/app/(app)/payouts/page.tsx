import Link from "next/link";
import { canWriteFinance, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReconciliationQueue } from "@/components/payouts/reconciliation-queue";
import { Button } from "@/components/ui/button";
import { OPEN_PAYOUT_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getSession();
  const where = { status: { in: [...OPEN_PAYOUT_STATUSES] } };
  const requested = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const total = await prisma.payout.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pageCount);
  const payouts = await prisma.payout.findMany({
    where,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      claimSnapshotId: true,
      claimNumber: true,
      settlementAmount: true,
      feeEarned: true,
      status: true,
      createdAt: true,
      notes: true,
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
      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-brand-slate">
            {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          {pageCount > 1 ? (
            <div className="flex gap-3 text-sm">
              {page > 1 ? (
                <Link href={page <= 2 ? "/payouts" : `/payouts?page=${page - 1}`} className="text-brand-gold">
                  Previous
                </Link>
              ) : (
                <span className="text-brand-slate">Previous</span>
              )}
              {page < pageCount ? (
                <Link href={`/payouts?page=${page + 1}`} className="text-brand-gold">
                  Next
                </Link>
              ) : (
                <span className="text-brand-slate">Next</span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
