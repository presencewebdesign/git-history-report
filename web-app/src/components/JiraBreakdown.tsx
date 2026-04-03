import { Bar } from "react-chartjs-2";
import type { Developer } from "../types";
import { getChartColor } from "../chartSetup";

interface Props {
  developers: Developer[];
}

export default function JiraBreakdown({ developers }: Props) {
  const devsWithTickets = developers.filter((d) => d.jiraBreakdown.length > 0);
  if (devsWithTickets.length === 0) return null;

  return (
    <div className="card full-width">
      <div className="card-title">
        <span className="icon">🔍</span> JIRA Ticket Breakdown by Developer
      </div>
      {devsWithTickets.map((dev, devIdx) => {
        const sorted = [...dev.jiraBreakdown].sort(
          (a, b) => b.commits - a.commits
        );
        const chartData = {
          labels: sorted.map((t) => t.ticket),
          datasets: [
            {
              label: "Commits",
              data: sorted.map((t) => t.commits),
              backgroundColor: getChartColor(devIdx),
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
                font: {
                  family: "'JetBrains Mono', monospace" as const,
                  size: 10,
                },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(42,46,66,0.3)" },
              ticks: {
                stepSize: 1,
                font: {
                  family: "'JetBrains Mono', monospace" as const,
                  size: 11,
                },
              },
            },
          },
        };

        return (
          <div key={dev.author} style={{ marginBottom: "2rem" }}>
            <div
              style={{
                fontWeight: 600,
                color: getChartColor(devIdx),
                marginBottom: "0.75rem",
                fontSize: "0.95rem",
              }}
            >
              {dev.author}{" "}
              <span style={{ color: "#8b90a5", fontWeight: 400, fontSize: "0.85rem" }}>
                ({dev.jiraBreakdown.length} tickets)
              </span>
            </div>
            <div style={{ height: Math.max(180, sorted.length * 8 + 120) }}>
              <Bar data={chartData} options={options} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
