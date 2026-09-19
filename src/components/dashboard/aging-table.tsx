import type { AgingBucket } from "@/lib/cash-flow";
import { formatCurrency } from "@/lib/utils";

export function AgingTable({ aging }: { aging: AgingBucket[] }) {
  const total = aging.reduce((s, b) => s + b.amount, 0);
  const count = aging.reduce((s, b) => s + b.count, 0);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Receivables aging</p>
          <p className="mt-1 text-sm text-brand-white/70">
            Unpaid fee balances, aged from payout open date.
          </p>
        </div>
        <p className="font-mono text-sm text-brand-gold">
          {formatCurrency(total, { cents: true })} · {count}
        </p>
      </div>
      <div className="overflow-x-auto border border-brand-white/10">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-white/10">
              <th className="eyebrow px-4 py-3 font-normal">Bucket</th>
              <th className="eyebrow px-4 py-3 font-normal">Files</th>
              <th className="eyebrow px-4 py-3 text-right font-normal">Amount</th>
              <th className="eyebrow hidden px-4 py-3 text-right font-normal sm:table-cell">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {aging.map((row) => {
              const share = total > 0 ? Math.round((row.amount / total) * 100) : 0;
              return (
                <tr key={row.key} className="border-b border-brand-white/5 last:border-0">
                  <td className="px-4 py-3 text-brand-white">{row.label}</td>
                  <td className="px-4 py-3 font-mono text-brand-white/80">{row.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-brand-white">
                    {formatCurrency(row.amount, { cents: true })}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-brand-slate sm:table-cell">
                    {share}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
