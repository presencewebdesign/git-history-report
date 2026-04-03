import { Bar } from "react-chartjs-2";
import type { CommitsByHour } from "../types";

interface Props {
  data: CommitsByHour[];
}

export default function CommitsByHourChart({ data }: Props) {
  const fullDay = Array.from({ length: 24 }, (_, i) => {
    const match = data.find((d) => d.hour === i);
    return { hour: i, commits: match?.commits ?? 0 };
  });

  const chartData = {
    labels: fullDay.map((d) => `${String(d.hour).padStart(2, "0")}:00`),
    datasets: [
      {
        label: "Commits",
        data: fullDay.map((d) => d.commits),
        backgroundColor: fullDay.map((d) =>
          d.hour >= 9 && d.hour < 17
            ? "rgba(6,182,212,0.7)"
            : "rgba(6,182,212,0.25)"
        ),
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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
        ticks: {
          maxTicksLimit: 12,
          font: { size: 10 },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(42,46,66,0.3)" },
        ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } },
      },
    },
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon">⏰</span> Commits by Hour of Day
      </div>
      <div style={{ height: 250 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
