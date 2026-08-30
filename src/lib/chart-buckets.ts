import {
  addDays,
  addHours,
  addMonths,
  addQuarters,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachHourOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfQuarter,
  subDays,
  subMonths,
} from "date-fns";
import type { Timeframe } from "@/lib/types";
import { roundCents } from "@/lib/utils";

export type RevenueEvent = {
  at: Date;
  amount: number;
};

export type ChartPoint = {
  t: number;
  label: string;
  tooltipDate: string;
  period: number;
  cumulative: number;
};

export type ChartSeries = {
  timeframe: Timeframe;
  from: Date;
  to: Date;
  points: ChartPoint[];
  periodTotal: number;
  priorTotal: number;
  delta: number;
  deltaPercent: number | null;
  isUp: boolean;
};

function eventTime(payout: { disbursementDate?: Date | string | null; createdAt: Date | string; status: string }) {
  if (payout.status !== "DISBURSED") return null;
  return new Date(payout.disbursementDate ?? payout.createdAt);
}

export function payoutsToEvents(
  payouts: Array<{
    feeEarned: number;
    status: string;
    disbursementDate?: Date | string | null;
    createdAt: Date | string;
  }>
): RevenueEvent[] {
  const events: RevenueEvent[] = [];
  for (const p of payouts) {
    const at = eventTime(p);
    if (!at) continue;
    events.push({ at, amount: p.feeEarned });
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function windowFor(timeframe: Timeframe, now: Date): { from: Date; to: Date; priorFrom: Date; priorTo: Date } {
  const to = now;
  switch (timeframe) {
    case "1D": {
      const from = startOfDay(now);
      const priorTo = new Date(from.getTime() - 1);
      const priorFrom = startOfDay(priorTo);
      return { from, to: endOfDay(now), priorFrom, priorTo };
    }
    case "1W": {
      const from = startOfDay(subDays(now, 6));
      const priorTo = new Date(from.getTime() - 1);
      const priorFrom = startOfDay(subDays(priorTo, 6));
      return { from, to, priorFrom, priorTo };
    }
    case "1M": {
      const from = startOfDay(subDays(now, 29));
      const priorTo = new Date(from.getTime() - 1);
      const priorFrom = startOfDay(subDays(priorTo, 29));
      return { from, to, priorFrom, priorTo };
    }
    case "1Y": {
      const from = startOfMonth(subMonths(now, 11));
      const priorTo = new Date(from.getTime() - 1);
      const priorFrom = startOfMonth(subMonths(priorTo, 11));
      return { from, to, priorFrom, priorTo };
    }
    case "ALL": {
      const from = new Date(0);
      return { from, to, priorFrom: from, priorTo: from };
    }
  }
}

function sumInRange(events: RevenueEvent[], from: Date, to: Date): number {
  let total = 0;
  const a = from.getTime();
  const b = to.getTime();
  for (const e of events) {
    const t = e.at.getTime();
    if (t >= a && t <= b) total += e.amount;
  }
  return roundCents(total);
}

function bucketEdges(timeframe: Timeframe, from: Date, to: Date, eventCount: number): Date[] {
  if (timeframe === "1D") {
    return eachHourOfInterval({ start: startOfHour(from), end: startOfHour(to) });
  }
  if (timeframe === "1W") {
    return eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });
  }
  if (timeframe === "1M") {
    const days = differenceInCalendarDays(to, from);
    if (days > 21) {
      // weekly-ish: every 2 days keeps the line readable
      const daysList = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });
      return daysList;
    }
    return eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });
  }
  if (timeframe === "1Y") {
    return eachMonthOfInterval({ start: startOfMonth(from), end: startOfMonth(to) });
  }
  // ALL — quarterly if long history, else monthly
  const months = eachMonthOfInterval({
    start: startOfMonth(from.getTime() === 0 ? to : from),
    end: startOfMonth(to),
  });
  if (months.length > 18 || eventCount > 80) {
    const start = startOfQuarter(months[0] ?? to);
    return eachQuarterOfInterval({ start, end: startOfQuarter(to) });
  }
  return months;
}

function nextEdge(timeframe: Timeframe, edge: Date, allTimeQuarterly: boolean): Date {
  if (timeframe === "1D") return addHours(edge, 1);
  if (timeframe === "1W" || timeframe === "1M") return addDays(edge, 1);
  if (timeframe === "1Y") return addMonths(edge, 1);
  return allTimeQuarterly ? addQuarters(edge, 1) : addMonths(edge, 1);
}

function labelFor(timeframe: Timeframe, edge: Date, allTimeQuarterly: boolean): string {
  if (timeframe === "1D") return format(edge, "h a");
  if (timeframe === "1W") return format(edge, "EEE");
  if (timeframe === "1M") return format(edge, "MMM d");
  if (timeframe === "1Y") return format(edge, "MMM");
  return allTimeQuarterly ? format(edge, "QQQ yyyy") : format(edge, "MMM yyyy");
}

function tooltipFor(timeframe: Timeframe, edge: Date, allTimeQuarterly: boolean): string {
  if (timeframe === "1D") return format(edge, "MMM d, yyyy · h:mm a");
  if (timeframe === "1W" || timeframe === "1M") return format(edge, "EEEE, MMM d, yyyy");
  if (timeframe === "1Y") return format(edge, "MMMM yyyy");
  return allTimeQuarterly ? format(edge, "QQQ yyyy") : format(edge, "MMMM yyyy");
}

export function buildChartSeries(
  events: RevenueEvent[],
  timeframe: Timeframe,
  now: Date = new Date()
): ChartSeries {
  const { from, to, priorFrom, priorTo } = windowFor(timeframe, now);

  const firstEvent = events[0]?.at;
  const allFrom =
    timeframe === "ALL"
      ? startOfMonth(firstEvent && firstEvent < to ? firstEvent : subMonths(to, 11))
      : from;

  const periodTotal = sumInRange(events, timeframe === "ALL" ? allFrom : from, to);
  const priorTotal =
    timeframe === "ALL" ? 0 : sumInRange(events, priorFrom, priorTo);
  const delta = roundCents(periodTotal - priorTotal);
  const deltaPercent =
    timeframe === "ALL" || priorTotal === 0
      ? periodTotal === 0
        ? 0
        : null
      : roundCents((delta / priorTotal) * 100);

  const edges = bucketEdges(timeframe, allFrom, to, events.length);
  const quarterly = timeframe === "ALL" && edges.length > 0 && edges.length <= 12 &&
    (differenceInCalendarDays(to, allFrom) > 540 || events.length > 80);

  let cumulative = 0;
  const points: ChartPoint[] = edges.map((edge) => {
    const end = new Date(nextEdge(timeframe, edge, quarterly).getTime() - 1);
    const period = sumInRange(events, edge, end > to ? to : end);
    cumulative = roundCents(cumulative + period);
    return {
      t: edge.getTime(),
      label: labelFor(timeframe, edge, quarterly),
      tooltipDate: tooltipFor(timeframe, edge, quarterly),
      period,
      cumulative,
    };
  });

  return {
    timeframe,
    from: timeframe === "ALL" ? allFrom : from,
    to,
    points,
    periodTotal,
    priorTotal,
    delta,
    deltaPercent,
    isUp: delta >= 0,
  };
}
