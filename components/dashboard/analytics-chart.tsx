"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface DailyView { date: string; views: number }

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function AnalyticsChart({ data, viewsLabel }: { data: DailyView[]; viewsLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          interval={4}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={20}
        />
        <Tooltip
          labelFormatter={(l: unknown) => shortDate(String(l))}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [v, viewsLabel]}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <Line
          type="monotone"
          dataKey="views"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
