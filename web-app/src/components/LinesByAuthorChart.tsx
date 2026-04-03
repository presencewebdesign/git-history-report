import { Bar } from "react-chartjs-2";
import type { LinesByAuthor } from "../types";

interface Props {
  data: LinesByAuthor[];
}

export default function LinesByAuthorChart({ data }: Props) {
  if (data.length === 0) return null;

  const chartData = {
    labels: data.map((d) => d.author),
    datasets: [
      {
        label: "Insertions",
        data: data.map((d) => d.insertions),
        backgroundColor: "rgba(34,197,94,0.7)",
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: "Deletions",
        data: data.map((d) => d.deletions),
        backgroundColor: "rgba(239,68,68,0.7)",
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, pointStyle: "rectRounded", padding: 16 },
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
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(42,46,66,0.3)" },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } },
      },
    },
  };

  return (
    <div className="card full-width">
      <div className="card-title">
        <span className="icon">👤</span> Lines Changed per Developer
      </div>
      <div style={{ height: Math.max(250, data.length * 50) }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
