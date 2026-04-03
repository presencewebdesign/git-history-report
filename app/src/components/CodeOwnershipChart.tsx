import { Bar } from "react-chartjs-2";
import type { CodeOwnershipFile } from "../types";
import { getChartColor } from "../chartSetup";

interface Props {
  data: CodeOwnershipFile[];
}

function shortenPath(p: string, max = 35): string {
  if (p.length <= max) return p;
  const parts = p.split("/");
  if (parts.length <= 2) return "..." + p.slice(-(max - 3));
  return parts[0] + "/.../" + parts.slice(-2).join("/");
}

export default function CodeOwnershipChart({ data }: Props) {
  if (data.length === 0) return null;

  const allAuthors = [...new Set(data.flatMap((f) => f.authors.map((a) => a.author)))];

  const datasets = allAuthors.map((author, i) => ({
    label: author,
    data: data.map((f) => {
      const match = f.authors.find((a) => a.author === author);
      return match?.commits ?? 0;
    }),
    backgroundColor: getChartColor(i),
    borderRadius: 3,
    borderSkipped: false as const,
  }));

  const chartData = {
    labels: data.map((f) => shortenPath(f.file)),
    datasets,
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, pointStyle: "rectRounded", padding: 14, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "#1c1f2e",
        borderColor: "#2a2e42",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items: { dataIndex: number }[]) =>
            items.length ? data[items[0].dataIndex].file : "",
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: "rgba(42,46,66,0.3)" },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 } },
      },
    },
  };

  const singleAuthorFiles = data.filter((f) => f.authors.length === 1).length;
  const busFactor = data.length > 0
    ? Math.round((1 - singleAuthorFiles / data.length) * 100)
    : 100;

  return (
    <div className="card full-width">
      <div className="card-title">
        <span className="icon">🏗️</span> Code Ownership
        <span className="badge" style={{
          marginLeft: "auto",
          background: busFactor >= 60 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color: busFactor >= 60 ? "#22c55e" : "#ef4444",
          padding: "0.2rem 0.6rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}>
          Bus factor: {busFactor}%
        </span>
      </div>
      <p style={{ fontSize: "0.78rem", color: "#5c6178", marginBottom: "0.75rem" }}>
        Stacked bars show which developers own each file. Files with a single contributor are a risk.
      </p>
      <div style={{ height: Math.max(300, data.length * 32) }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
