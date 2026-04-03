import { Bar } from "react-chartjs-2";
import type { CommitByAuthor } from "../types";
import { getChartColor } from "../chartSetup";

interface Props {
  data: CommitByAuthor[];
}

export default function CommitsByAuthorChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.author),
    datasets: [
      {
        label: "Commits",
        data: data.map((d) => d.commits),
        backgroundColor: data.map((_, i) => getChartColor(i)),
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1c1f2e",
        borderColor: "#2a2e42",
        borderWidth: 1,
        titleFont: { weight: "bold" as const },
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(42,46,66,0.3)" },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
    },
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon">👥</span> Commits by Author
      </div>
      <div style={{ height: Math.max(200, data.length * 50) }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
