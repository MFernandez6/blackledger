"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TIMEFRAME_TABS } from "@/lib/constants";
import type { ChartSeries } from "@/lib/chart-buckets";
import type { Timeframe } from "@/lib/types";
import { cn, formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/utils";
import { useTheme } from "@/lib/use-theme";

const CHART_COLORS = {
  dark: { gold: "#C6A85B", slate: "#8B95A5", surface: "#0F1C2E", cursor: "rgba(198,168,91,0.35)" },
  light: { gold: "#8A6A22", slate: "#4B5768", surface: "#F1EDE4", cursor: "rgba(138,106,34,0.35)" },
} as const;

const RevenuePlot = dynamic(
  () => import("@/components/dashboard/revenue-chart-plot").then((m) => m.RevenuePlot),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 h-[220px] w-full min-w-0 animate-pulse bg-brand-white/5 sm:h-[280px] lg:h-[340px]" />
    ),
  }
);

type Props = {
  series: ChartSeries;
};

export function RevenueChart({ series }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("tf") as Timeframe) || series.timeframe;

  const { theme } = useTheme();
  const colors = CHART_COLORS[theme];
  const data = useMemo(() => series.points, [series.points]);
  const stroke = series.isUp ? colors.gold : colors.slate;
  const fillId = series.isUp ? "ledgerUp" : "ledgerFlat";

  function setTimeframe(tf: Timeframe) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tf", tf);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <section className="panel min-w-0 overflow-hidden px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Fee revenue</p>
          <p className="mt-2 font-mono text-3xl tracking-tight text-brand-white sm:text-4xl">
            {formatCurrency(series.periodTotal, { cents: true })}
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-sm",
              series.isUp ? "text-brand-gold" : "text-brand-slate"
            )}
          >
            {series.timeframe === "ALL" ? (
              <span>All realized disbursements</span>
            ) : (
              <>
                {formatSignedCurrency(series.delta)}
                {series.deltaPercent !== null ? (
                  <span className="ml-2">
                    {formatSignedPercent(series.deltaPercent)} this period
                  </span>
                ) : (
                  <span className="ml-2 text-brand-slate">vs prior period</span>
                )}
              </>
            )}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Revenue timeframe"
          className="flex border border-brand-gold/15 rounded-2xl"
        >
          {TIMEFRAME_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={cn(
                "px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
                active === tab.id
                  ? "bg-brand-gold/20 text-brand-gold"
                  : "text-brand-slate hover:text-brand-white"
              )}
            >
              {tab.short}
            </button>
          ))}
        </div>
      </div>

      <RevenuePlot data={data} colors={colors} stroke={stroke} fillId={fillId} />
      <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.16em] text-brand-slate">
        Cumulative fee revenue disbursed · {series.timeframe} · source: BLACKLEDGER payouts
      </p>
    </section>
  );
}
