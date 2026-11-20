"use client";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { CHART, SERIES } from "./palette";

/** Horizontal bar chart for a single 0–100 measure across categories. */
export function BarBreakdown({
  data,
  valueKey,
  valueLabel,
}: {
  data: { label: string; [k: string]: string | number | null }[];
  valueKey: string;
  valueLabel: string;
}) {
  const height = Math.max(120, data.length * 38 + 24);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }} barCategoryGap={10}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fill: CHART.text, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fill: CHART.text, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(255 255 255 / 0.03)" }} />
          <Bar dataKey={valueKey} name={valueLabel} fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            <LabelList dataKey={valueKey} position="right" fill="#c3cad6" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
