import { Line } from "react-chartjs-2";
import type { WeeklyVelocity } from "../types";

interface Props {
  data: WeeklyVelocity[];
}

export default function WeeklyVelocityChart({ data }: Props) {
  if (data.length === 0) return null;

  const avg = data.reduce((s, d) => s + d.commits, 0) / data.length;

  const chartData = {
    labels: data.map((d) => d.week),
    datasets: [
      {
        label: "Commits per week",
        data: data.map((d) => d.commits),
        borderColor: "#a855f7",
        backgroundColor: "rgba(168,85,247,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: data.length > 30 ? 0 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#a855f7",
        borderWidth: 2,
      },
      {
        label: "Average",
        data: data.map(() => Math.round(avg * 10) / 10),
        borderColor: "rgba(239,68,68,0.5)",
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, pointStyle: "line", padding: 16, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "#1c1f2e",
        borderColor: "#2a2e42",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 12, font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(42,46,66,0.3)" },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } },
      },
    },
    interaction: { intersect: false, mode: "index" as const },
  };

  return (
    <div className="card full-width">
      <div className="card-title">
        <span className="icon">📈</span> Weekly Commit Velocity
      </div>
      <div style={{ height: 300 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
