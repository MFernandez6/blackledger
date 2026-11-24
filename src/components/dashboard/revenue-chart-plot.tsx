"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "@/lib/chart-buckets";
import { formatCurrency } from "@/lib/utils";

type Colors = {
  gold: string;
  slate: string;
  surface: string;
  cursor: string;
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
    <div className="rounded-xl border border-brand-gold/40 bg-brand-navy px-3 py-2">
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

export function RevenuePlot({
  data,
  colors,
  stroke,
  fillId,
}: {
  data: ChartSeries["points"];
  colors: Colors;
  stroke: string;
  fillId: string;
}) {
  return (
    <div className="mt-6 h-[220px] w-full min-w-0 sm:h-[280px] lg:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ledgerUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.gold} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colors.gold} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="ledgerFlat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.slate} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colors.slate} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: colors.slate, fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            dataKey="cumulative"
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
            tick={{ fill: colors.slate, fontSize: 10, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={<TickerTooltip />}
            cursor={{ stroke: colors.cursor, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            activeDot={{ r: 3, fill: stroke, stroke: colors.surface, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
