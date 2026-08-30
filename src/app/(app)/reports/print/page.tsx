import { loadDashboard } from "@/lib/queries/dashboard";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { PrintButton } from "@/components/reports/print-button";

export const dynamic = "force-dynamic";

export default async function PrintReportPage() {
  const { cash, payouts, splits } = await loadDashboard("ALL");

  return (
    <div className="print-sheet space-y-8">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>

      <header>
        <p className="eyebrow">BLACKLEDGER · accounting handoff</p>
        <h1 className="mt-2 font-serif text-2xl tracking-[0.12em]">
          Cash-flow report
        </h1>
        <p className="mt-1 text-sm text-brand-slate">
          As of {format(cash.asOf, "MMMM d, yyyy")} · Blackline Public Adjusters LLC
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pipeline" value={cash.pipelineValue} />
        <Stat label="Realized YTD" value={cash.realizedYtd} />
        <Stat label="Receivables" value={cash.receivables} />
      </section>

      <section>
        <p className="eyebrow mb-3">Aging</p>
        <table className="w-full text-sm">
          <tbody>
            {cash.aging.map((b) => (
              <tr key={b.key} className="border-t border-brand-white/10">
                <td className="py-2">{b.label}</td>
                <td className="py-2 text-right font-mono">
                  {formatCurrency(b.amount, { cents: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <p className="eyebrow mb-3">Open payouts</p>
        <table className="w-full text-sm">
          <tbody>
            {payouts
              .filter((p) => p.status !== "DISBURSED" && p.status !== "VOID")
              .map((p) => (
                <tr key={p.id} className="border-t border-brand-white/10">
                  <td className="py-2 font-mono">{p.claimNumber}</td>
                  <td className="py-2">{p.status}</td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(p.feeEarned, { cents: true })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section>
        <p className="eyebrow mb-3">Partner splits</p>
        <table className="w-full text-sm">
          <tbody>
            {splits.map((s) => (
              <tr key={s.id} className="border-t border-brand-white/10">
                <td className="py-2">{s.partner.name}</td>
                <td className="py-2 font-mono">{s.payout.claimNumber}</td>
                <td className="py-2">{s.status}</td>
                <td className="py-2 text-right font-mono">
                  {formatCurrency(s.splitAmount, { cents: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-brand-white/10 px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-xl">{formatCurrency(value, { cents: true })}</p>
    </div>
  );
}
