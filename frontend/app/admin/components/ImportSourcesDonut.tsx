"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CountryDistribution } from "@/lib/analytics";
import styles from "../dashboard.module.css";

const COLORS = ["#1d4ed8", "#0f766e", "#2563eb", "#0284c7"];

type Props = {
  data: CountryDistribution[];
};

function ImportTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: CountryDistribution & { share: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const share = row.payload?.share ?? 0;
  return (
    <div className={styles.chartTooltip}>
      <strong>{row.name}</strong>
      <div>{Number(row.value ?? 0).toLocaleString("tr-TR")} birim</div>
      <div>%{share.toFixed(1)}</div>
    </div>
  );
}

export default function ImportSourcesDonut({ data }: Props) {
  const total = data.reduce((sum, row) => sum + row.quantity, 0) || 1;
  const chartData = data.map((row) => ({
    ...row,
    name: row.country_name,
    value: row.quantity,
    share: (row.quantity / total) * 100,
  }));

  return (
    <div className={styles.donutLayout}>
      <div className={styles.donutChart}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.import_country_id}-${entry.country_code}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<ImportTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.donutCenter}>
          <span className={styles.donutCenterLabel}>Toplam</span>
          <span className={styles.donutCenterValue}>
            {total.toLocaleString("tr-TR")}
          </span>
        </div>
      </div>
      <ul className={styles.donutLegend}>
        {chartData.map((row, index) => (
          <li key={row.import_country_id}>
            <span
              className={styles.legendSwatch}
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className={styles.legendName}>{row.country_name}</span>
            <span className={styles.legendMeta}>
              {row.quantity.toLocaleString("tr-TR")} · %{row.share.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
