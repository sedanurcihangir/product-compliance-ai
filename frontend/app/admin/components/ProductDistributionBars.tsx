"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductDistributionAnalytics } from "@/lib/analytics";
import styles from "../dashboard.module.css";

type Props = {
  data: ProductDistributionAnalytics[];
};

function ProductTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ProductDistributionAnalytics }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className={styles.chartTooltip}>
      <strong>{row.product_name}</strong>
      <div>{row.quantity.toLocaleString("tr-TR")} birim</div>
    </div>
  );
}

export default function ProductDistributionBars({ data }: Props) {
  const chartData = [...data].sort((a, b) => b.quantity - a.quantity);
  const height = Math.max(220, chartData.length * 48);

  return (
    <div className={styles.productChartBody} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="product_name"
            width={140}
            tick={{ fill: "#111827", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "rgba(37, 99, 235, 0.06)" }} content={<ProductTooltip />} />
          <Bar
            dataKey="quantity"
            fill="#2563eb"
            radius={[0, 8, 8, 0]}
            barSize={22}
            name="Miktar"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
