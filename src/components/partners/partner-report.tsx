"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateSplitAction } from "@/lib/actions/payouts";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/utils";

export type SplitRow = {
  id: string;
  partnerName: string;
  claimNumber: string;
  intakeNumber: string | null;
  referralSource: string | null;
  splitPercent: number;
  splitAmount: number;
  status: string;
};

export function PartnerReport({
  rows,
  canWrite,
}: {
  rows: SplitRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function markPaid(id: string) {
    setBusy(id);
    const res = await updateSplitAction({ splitId: id, status: "PAID" });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Referral split marked paid.");
    router.refresh();
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.all += r.splitAmount;
      if (r.status === "PAID") acc.paid += r.splitAmount;
      else if (r.status !== "VOID") acc.due += r.splitAmount;
      return acc;
    },
    { all: 0, paid: 0, due: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-px bg-brand-white/10">
        <Stat label="Accrued" value={totals.all} />
        <Stat label="Due" value={totals.due} />
        <Stat label="Paid" value={totals.paid} />
      </div>

      <div className="space-y-px bg-brand-white/10 xl:hidden">
        {rows.map((row) => (
          <div key={row.id} className="bg-brand-navy px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-brand-white">{row.partnerName}</p>
                <p className="mt-1 font-mono text-xs text-brand-gold">
                  {row.claimNumber}
                  {row.intakeNumber ? (
                    <span className="ml-2 text-brand-slate">{row.intakeNumber}</span>
                  ) : null}
                </p>
              </div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-brand-white/80">
                {row.status}
              </p>
            </div>
            <div className="mt-3 flex justify-between font-mono text-xs text-brand-white">
              <span>{formatPercent(row.splitPercent)}</span>
              <span>{formatCurrency(row.splitAmount, { cents: true })}</span>
            </div>
            {canWrite && row.status !== "PAID" && row.status !== "VOID" ? (
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={busy === row.id}
                onClick={() => markPaid(row.id)}
              >
                Mark paid
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto border border-brand-white/10 xl:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brand-white/10">
              <th className="eyebrow px-4 py-3 font-normal">Partner</th>
              <th className="eyebrow px-4 py-3 font-normal">Claim</th>
              <th className="eyebrow px-4 py-3 font-normal">Source</th>
              <th className="eyebrow px-4 py-3 text-right font-normal">Split</th>
              <th className="eyebrow px-4 py-3 text-right font-normal">Amount</th>
              <th className="eyebrow px-4 py-3 font-normal">Status</th>
              <th className="eyebrow px-4 py-3 font-normal"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-brand-white/5 last:border-0">
                <td className="px-4 py-3 text-brand-white">{row.partnerName}</td>
                <td className="px-4 py-3 font-mono text-brand-gold">
                  {row.claimNumber}
                  {row.intakeNumber ? (
                    <span className="ml-2 text-brand-slate">{row.intakeNumber}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-brand-slate">
                  {row.referralSource ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatPercent(row.splitPercent)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatCurrency(row.splitAmount, { cents: true })}
                </td>
                <td className="px-4 py-3 uppercase tracking-[0.12em] text-brand-white/80">
                  {row.status}
                </td>
                <td className="px-4 py-3">
                  {canWrite && row.status !== "PAID" && row.status !== "VOID" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => markPaid(row.id)}
                    >
                      Mark paid
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-brand-navy px-4 py-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-lg text-brand-white sm:text-xl">
        {formatCurrency(value, { cents: true })}
      </p>
    </div>
  );
}
