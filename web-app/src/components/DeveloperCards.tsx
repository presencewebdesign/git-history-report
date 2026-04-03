import { Doughnut } from "react-chartjs-2";
import type { Developer } from "../types";
import { getChartColor } from "../chartSetup";

interface Props {
  data: Developer[];
}

export default function DeveloperCards({ data }: Props) {
  if (data.length === 0) return null;

  const totalCommits = data.reduce((sum, d) => sum + d.commits, 0);

  const donutData = {
    labels: data.map((d) => d.author),
    datasets: [
      {
        data: data.map((d) => d.commits),
        backgroundColor: data.map((_, i) => getChartColor(i)),
        borderColor: "#1c1f2e",
        borderWidth: 2,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 12,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "#1c1f2e",
        borderColor: "#2a2e42",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => {
            const val = ctx.raw as number;
            const pct = ((val / totalCommits) * 100).toFixed(1);
            return ` ${ctx.label}: ${val} commits (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <>
      <div className="card full-width">
        <div className="card-title">
          <span className="icon">📊</span> Commit Distribution
        </div>
        <div style={{ height: 280, maxWidth: 500, margin: "0 auto" }}>
          <Doughnut data={donutData} options={donutOptions} />
        </div>
      </div>

      <div className="full-width">
        <h2 className="section-title">⚡ Developer Profiles</h2>
        <div className="dev-grid">
          {data.map((dev) => (
            <div className="dev-card" key={dev.author}>
              <div className="dev-name">{dev.author}</div>
              <div className="dev-stat">
                <span className="label">Commits</span>
                <span className="value">{dev.commits}</span>
              </div>
              <div className="dev-stat">
                <span className="label">Longest Streak</span>
                <span className="value">{dev.streak} days</span>
              </div>
              <div className="dev-stat">
                <span className="label">Working Hours</span>
                <span className="value">
                  {dev.firstHour}:00 – {dev.lastHour}:00
                </span>
              </div>
              <div className="dev-stat">
                <span className="label">Avg Between Commits</span>
                <span className="value">{dev.avgTimeBetweenCommits}</span>
              </div>
              <div className="dev-stat">
                <span className="label">JIRA Tickets</span>
                <span className="value">{dev.tickets}</span>
              </div>
              <div className="dev-stat">
                <span className="label">Commits/Ticket</span>
                <span className="value">~{dev.commitsPerTicket}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
