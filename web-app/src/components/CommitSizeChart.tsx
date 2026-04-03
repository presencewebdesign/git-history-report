import { Doughnut } from "react-chartjs-2";
import type { CommitSizeDistribution } from "../types";

interface Props {
  data: CommitSizeDistribution;
}

const LABELS = [
  { key: "small" as const, label: "Small (1–10 lines)", color: "#22c55e" },
  { key: "medium" as const, label: "Medium (11–100)", color: "#3b82f6" },
  { key: "large" as const, label: "Large (101–500)", color: "#f59e0b" },
  { key: "xlarge" as const, label: "X-Large (500+)", color: "#ef4444" },
];

export default function CommitSizeChart({ data }: Props) {
  const total = data.small + data.medium + data.large + data.xlarge;
  if (total === 0) return null;

  const chartData = {
    labels: LABELS.map((l) => l.label),
    datasets: [
      {
        data: LABELS.map((l) => data[l.key]),
        backgroundColor: LABELS.map((l) => l.color),
        borderColor: "#1c1f2e",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { usePointStyle: true, pointStyle: "circle", padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "#1c1f2e",
        borderColor: "#2a2e42",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => {
            const val = ctx.raw as number;
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon">📐</span> Commit Size Distribution
      </div>
      <div style={{ height: 280 }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
