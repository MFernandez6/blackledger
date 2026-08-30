import Link from "next/link";
import { canWriteFinance, getSession } from "@/lib/auth";
import { loadDashboard } from "@/lib/queries/dashboard";
import { TIMEFRAMES, type Timeframe } from "@/lib/types";
import { AgingTable } from "@/components/dashboard/aging-table";
import { CashFlowKpis } from "@/components/dashboard/cash-flow-kpis";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SyncButton } from "@/components/dashboard/sync-button";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ClaimStatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

function parseTf(raw: string | undefined): Timeframe {
  return TIMEFRAMES.includes(raw as Timeframe) ? (raw as Timeframe) : "1M";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tf?: string };
}) {
  const session = await getSession();
  const timeframe = parseTf(searchParams.tf);
  const { snapshots, payouts, cash, series } = await loadDashboard(timeframe);
  const canWrite = session ? canWriteFinance(session.user.role) : false;

  const recent = snapshots.slice(0, 8);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Firm ledger</p>
          <h1 className="mt-2 font-serif text-2xl tracking-[0.12em] text-brand-white">
            Cash position
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-white/70">
            Pipeline, realized fees, and receivables across active BLACKLINE files.
            Claim status remains in BLACKBOX.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? <SyncButton /> : null}
          <Button asChild size="sm" variant="outline">
            <Link href="/api/export/cash-flow">Export CSV</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/reports/print">Print / PDF</Link>
          </Button>
        </div>
      </div>

      <CashFlowKpis cash={cash} />
      <RevenueChart series={series} />

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <AgingTable aging={cash.aging} />
        <section>
          <div className="mb-3 flex items-end justify-between">
            <p className="eyebrow">Recent files</p>
            <Link
              href="/claims"
              className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green-soft"
            >
              All files
            </Link>
          </div>
          <div className="border border-brand-white/10">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/claims/${c.id}`}
                className="flex items-center justify-between gap-3 border-b border-brand-white/5 px-4 py-3 last:border-0 hover:bg-brand-white/5"
              >
                <div>
                  <p className="font-mono text-sm text-brand-green-soft">{c.claimNumber}</p>
                  <p className="text-xs text-brand-white/70">{c.primaryClaimant}</p>
                </div>
                <div className="text-right">
                  <ClaimStatusBadge status={c.status} />
                  <p className="mt-1 font-mono text-xs text-brand-slate">
                    {formatCurrency(c.settlementAmount ?? c.demandAmount ?? c.estimatedValue)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-brand-slate">
            {payouts.filter((p) => p.status === "DISBURSED").length} disbursed ·{" "}
            {payouts.filter((p) => p.status !== "DISBURSED" && p.status !== "VOID").length}{" "}
            open payouts
          </p>
        </section>
      </div>
    </div>
  );
}
