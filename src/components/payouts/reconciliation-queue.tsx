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
    <div className="overflow-x-auto border border-brand-white/10">
      <table className="w-full min-w-[760px] text-left text-sm">
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
                  className="font-mono text-brand-green-soft hover:text-brand-white"
                >
                  {row.claimNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-brand-white/90">{row.claimant}</td>
              <td className="px-4 py-3 text-right font-mono">
                {formatCurrency(row.settlementAmount, { cents: true })}
              </td>
              <td className="px-4 py-3 text-right font-mono text-brand-green-soft">
                {formatCurrency(row.feeEarned, { cents: true })}
              </td>
              <td className="px-4 py-3">
                <PayoutStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 font-mono text-brand-slate">{row.docCount}</td>
              <td className="px-4 py-3">
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    {row.status === "PENDING" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === row.id}
                        onClick={() => setStatus(row.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {row.status === "APPROVED" || row.status === "PENDING" ? (
                      <Button
                        size="sm"
                        variant="solid"
                        disabled={busy === row.id}
                        onClick={() => setStatus(row.id, "DISBURSED")}
                      >
                        Mark disbursed
                      </Button>
                    ) : null}
                    {row.status !== "HELD" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === row.id}
                        onClick={() => setStatus(row.id, "HELD")}
                      >
                        Hold
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === row.id}
                        onClick={() => setStatus(row.id, "PENDING")}
                      >
                        Release
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-brand-slate">Read only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
