import type { CashFlowView } from "@/lib/cash-flow";
import { formatCurrency } from "@/lib/utils";

export function CashFlowKpis({ cash }: { cash: CashFlowView }) {
  const cards = [
    {
      label: "Pipeline value",
      value: cash.pipelineValue,
      note: `${cash.claimCountActive} active files × estimated fee`,
    },
    {
      label: "Realized YTD",
      value: cash.realizedYtd,
      note: "Disbursed this calendar year",
    },
    {
      label: "Receivables",
      value: cash.receivables,
      note: `${cash.payoutCountOpen} settled, not yet disbursed`,
    },
    {
      label: "Realized (all)",
      value: cash.realizedRevenue,
      note: "Lifetime disbursed fee revenue",
    },
  ];

  return (
    <div className="grid gap-px bg-brand-white/10 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-brand-navy px-4 py-5">
          <p className="eyebrow">{card.label}</p>
          <p className="mt-3 font-mono text-2xl text-brand-white">
            {formatCurrency(card.value, { cents: true })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-brand-slate">{card.note}</p>
        </div>
      ))}
    </div>
  );
}
