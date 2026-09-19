"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TIMEFRAME_TABS } from "@/lib/constants";
import type { ChartSeries } from "@/lib/chart-buckets";
import type { Timeframe } from "@/lib/types";
import { cn, formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/utils";

type Props = {
  series: ChartSeries;
};

function TickerTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartSeries["points"][number] }>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="border border-brand-gold/40 bg-brand-navy px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-slate">
        {point.tooltipDate}
      </p>
      <p className="mt-1 font-mono text-sm text-brand-gold">
        {formatCurrency(point.cumulative, { cents: true })}
      </p>
      <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.16em] text-brand-white/60">
        Period {formatCurrency(point.period, { cents: true })}
      </p>
    </div>
  );
}

export function RevenueChart({ series }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("tf") as Timeframe) || series.timeframe;

  const data = useMemo(() => series.points, [series.points]);
  const stroke = series.isUp ? "#C6A85B" : "#8B95A5";
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
          className="flex border border-brand-white/10"
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

      <div className="mt-6 h-[220px] w-full min-w-0 sm:h-[280px] lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ledgerUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6A85B" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#C6A85B" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ledgerFlat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B95A5" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#8B95A5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#8B95A5", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              dataKey="cumulative"
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
              tick={{ fill: "#8B95A5", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={<TickerTooltip />}
              cursor={{ stroke: "rgba(198,168,91,0.35)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#${fillId})`}
              activeDot={{ r: 3, fill: stroke, stroke: "#0F1C2E", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 font-sans text-[10px] uppercase tracking-[0.16em] text-brand-slate">
        Cumulative fee revenue disbursed · {series.timeframe} · source: BLACKLEDGER payouts
      </p>
    </section>
  );
}
