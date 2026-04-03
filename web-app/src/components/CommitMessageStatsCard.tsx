import type { CommitMessageStats } from "../types";

interface Props {
  data: CommitMessageStats;
  jiraKey: string;
}

export default function CommitMessageStatsCard({ data, jiraKey }: Props) {
  if (data.total === 0) return null;

  const ticketPct = Math.round((data.withTicketRef / data.total) * 100);

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon">💬</span> Commit Message Quality
      </div>
      <div className="msg-stats-grid">
        <div className="msg-stat">
          <div className="msg-stat-value">{data.avgLength}</div>
          <div className="msg-stat-label">Avg characters</div>
        </div>
        <div className="msg-stat">
          <div className="msg-stat-value">{data.avgWords}</div>
          <div className="msg-stat-label">Avg words</div>
        </div>
        <div className="msg-stat">
          <div className="msg-stat-value">{ticketPct}%</div>
          <div className="msg-stat-label">With {jiraKey} ref</div>
        </div>
        <div className="msg-stat">
          <div className="msg-stat-value">{data.withTicketRef}</div>
          <div className="msg-stat-label">Ticket-linked</div>
        </div>
      </div>
      <div className="msg-bar-track">
        <div
          className="msg-bar-fill"
          style={{ width: `${ticketPct}%` }}
        />
      </div>
      <div className="msg-bar-label">
        {data.withTicketRef} of {data.total} commits reference a {jiraKey} ticket
      </div>
    </div>
  );
}
