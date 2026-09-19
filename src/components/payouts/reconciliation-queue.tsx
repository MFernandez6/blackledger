"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePayoutAction } from "@/lib/actions/payouts";
import { PayoutStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PayoutStatus } from "@/lib/types";

export type QueueRow = {
  id: string;
  claimSnapshotId: string;
  claimNumber: string;
  claimant: string;
  settlementAmount: number;
  feeEarned: number;
  status: string;
  createdAt: string;
  notes: string | null;
  docCount: number;
};

export function ReconciliationQueue({
  rows,
  canWrite,
}: {
  rows: QueueRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: PayoutStatus) {
    setBusy(id);
    const res = await updatePayoutAction({ payoutId: id, status });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Payout marked ${status.toLowerCase()}.`);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="border border-brand-white/10 px-4 py-8 text-sm text-brand-slate">
        Reconciliation queue is clear. Settled files with open payouts will appear here.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-px bg-brand-white/10 xl:hidden">
        {rows.map((row) => (
          <div key={row.id} className="bg-brand-navy px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/claims/${row.claimSnapshotId}`}
                  className="font-mono text-sm text-brand-gold hover:text-brand-white"
                >
                  {row.claimNumber}
                </Link>
                <p className="mt-1 truncate text-sm text-brand-white/90">{row.claimant}</p>
              </div>
              <PayoutStatusBadge status={row.status} />
            </div>
            <div className="mt-3 flex justify-between font-mono text-xs">
              <span className="text-brand-slate">
                Settlement {formatCurrency(row.settlementAmount, { cents: true })}
              </span>
              <span className="text-brand-gold">
                {formatCurrency(row.feeEarned, { cents: true })}
              </span>
            </div>
            <p className="mt-2 font-sans text-[10px] uppercase tracking-[0.16em] text-brand-slate">
              {row.docCount} document{row.docCount === 1 ? "" : "s"}
            </p>
            <div className="mt-3">
              <QueueActions
                row={row}
                canWrite={canWrite}
                busy={busy === row.id}
                onStatus={setStatus}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto border border-brand-white/10 xl:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brand-white/10">
              <th className="eyebrow px-4 py-3 font-normal">Claim</th>
              <th className="eyebrow px-4 py-3 font-normal">Claimant</th>
              <th className="eyebrow px-4 py-3 text-right font-normal">Settlement</th>
              <th className="eyebrow px-4 py-3 text-right font-normal">Fee</th>
              <th className="eyebrow px-4 py-3 font-normal">Status</th>
              <th className="eyebrow px-4 py-3 font-normal">Docs</th>
              <th className="eyebrow px-4 py-3 font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-brand-white/5 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/claims/${row.claimSnapshotId}`}
                    className="font-mono text-brand-gold hover:text-brand-white"
                  >
                    {row.claimNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-brand-white/90">{row.claimant}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatCurrency(row.settlementAmount, { cents: true })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-brand-gold">
                  {formatCurrency(row.feeEarned, { cents: true })}
                </td>
                <td className="px-4 py-3">
                  <PayoutStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 font-mono text-brand-slate">{row.docCount}</td>
                <td className="px-4 py-3">
                  <QueueActions
                    row={row}
                    canWrite={canWrite}
                    busy={busy === row.id}
                    onStatus={setStatus}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function QueueActions({
  row,
  canWrite,
  busy,
  onStatus,
}: {
  row: QueueRow;
  canWrite: boolean;
  busy: boolean;
  onStatus: (id: string, status: PayoutStatus) => void;
}) {
  if (!canWrite) {
    return <span className="text-xs text-brand-slate">Read only</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {row.status === "PENDING" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onStatus(row.id, "APPROVED")}
        >
          Approve
        </Button>
      ) : null}
      {row.status === "APPROVED" || row.status === "PENDING" ? (
        <Button
          size="sm"
          variant="solid"
          disabled={busy}
          onClick={() => onStatus(row.id, "DISBURSED")}
        >
          Mark disbursed
        </Button>
      ) : null}
      {row.status !== "HELD" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => onStatus(row.id, "HELD")}
        >
          Hold
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onStatus(row.id, "PENDING")}
        >
          Release
        </Button>
      )}
    </div>
  );
}
