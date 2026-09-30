"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { CHART } from "@/lib/chart";

const QUARTERS = ["Q3-24", "Q4-24", "Q1-25", "Q2-25", "Q3-25", "Q4-25", "Q1-26", "Q2-26"];

export function PerformanceSparkline({ data, height = 44 }: { data: number[]; height?: number }) {
  if (data.every((d) => d === 0))
    return <div className="flex items-center justify-center rounded-md bg-navy-50/60 text-[11px] text-navy-400" style={{ height }}>No ECB performance history</div>;
  const rows = data.map((v, i) => ({ q: QUARTERS[i], score: v }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 6, right: 6, left: 6, bottom: 4 }}>
          <YAxis hide domain={["dataMin - 4", "dataMax + 2"]} />
          <Tooltip content={<ChartTooltip format={(v) => `${v} / 100`} />} cursor={{ stroke: CHART.grid }} labelFormatter={(_, p) => p?.[0]?.payload?.q} />
          <Line type="monotone" dataKey="score" name="Performance" stroke={CHART.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
