import { Bar } from "react-chartjs-2";
import type { CommitsByDayOfWeek } from "../types";

interface Props {
  data: CommitsByDayOfWeek[];
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CommitsByDayChart({ data }: Props) {
  const sorted = [...data].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  const chartData = {
    labels: sorted.map((d) => d.day.slice(0, 3)),
    datasets: [
      {
        label: "Commits",
        data: sorted.map((d) => d.commits),
        backgroundColor: sorted.map((d) =>
          d.day === "Saturday" || d.day === "Sunday"
            ? "rgba(239,68,68,0.6)"
            : "rgba(99,102,241,0.7)"
        ),
        borderRadius: 6,
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
      x: { grid: { display: false } },
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
        <span className="icon">📆</span> Commits by Day of Week
      </div>
      <div style={{ height: 250 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
