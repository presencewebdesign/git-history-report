import { useState } from "react";
import type { DetailedCommitDay } from "../types";

interface Props {
  data: DetailedCommitDay[];
}

export default function DetailedCommits({ data }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (data.length === 0) return null;

  const visible = expanded ? data : data.slice(0, 5);

  return (
    <div className="card full-width">
      <div className="card-title">
        <span className="icon">📝</span> Detailed Commit Log
      </div>
      {visible.map((day) => (
        <div key={day.date} style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "#06b6d4",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            📅 {day.date}
            <span style={{ color: "#5c6178", fontWeight: 400 }}>
              ({day.dayOfWeek})
            </span>
            <span
              style={{
                marginLeft: "auto",
                background: "rgba(59,130,246,0.15)",
                color: "#3b82f6",
                padding: "0.1rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
              }}
            >
              {day.commits.length} commit{day.commits.length !== 1 ? "s" : ""}
            </span>
          </div>
          {day.commits.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 120px 1fr",
                gap: "0.75rem",
                padding: "0.4rem 0 0.4rem 1rem",
                fontSize: "0.83rem",
                borderLeft: "2px solid #2a2e42",
              }}
            >
              <span className="hash">{c.hash}</span>
              <span style={{ color: "#8b90a5" }}>{c.author}</span>
              <span>
                {c.jira && <span className="jira-tag" style={{ marginRight: "0.5rem" }}>{c.jira}</span>}
                {c.subject}
              </span>
            </div>
          ))}
        </div>
      ))}
      {data.length > 5 && (
        <button
          className="btn-secondary"
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: "0.5rem" }}
        >
          {expanded ? "Show Less" : `Show All ${data.length} Days`}
        </button>
      )}
    </div>
  );
}
