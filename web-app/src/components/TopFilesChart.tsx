import { Bar } from "react-chartjs-2";
import type { TopChangedFile } from "../types";

interface Props {
  data: TopChangedFile[];
}

function shortenPath(filePath: string, maxLen = 40): string {
  if (filePath.length <= maxLen) return filePath;
  const parts = filePath.split("/");
  if (parts.length <= 2) return "..." + filePath.slice(-maxLen + 3);
  return parts[0] + "/.../" + parts.slice(-2).join("/");
}

export default function TopFilesChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => shortenPath(d.file)),
    datasets: [
      {
        label: "Changes",
        data: data.map((d) => d.changes),
        backgroundColor: "rgba(236,72,153,0.7)",
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
        padding: 12,
        callbacks: {
          title: (_items: unknown[]) => "",
          label: (ctx: { dataIndex: number; formattedValue: string }) =>
            `${data[ctx.dataIndex].file}: ${ctx.formattedValue} changes`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(42,46,66,0.3)" },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { family: "'JetBrains Mono', monospace", size: 10 },
        },
      },
    },
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon">🔥</span> Top 10 Most Changed Files
      </div>
      <div style={{ height: Math.max(250, data.length * 32) }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
