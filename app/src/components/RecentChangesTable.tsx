import type { RecentFileChange } from "../types";

interface Props {
  data: RecentFileChange[];
}

export default function RecentChangesTable({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="card full-width">
      <div className="card-title">
        <span className="icon">🕒</span> Most Recent File Changes
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Hash</th>
              <th>File</th>
              <th>Subject</th>
              <th>Ticket</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>{item.date}</td>
                <td>
                  <span className="hash">{item.hash}</span>
                </td>
                <td>
                  <span className="file-path">{item.file}</span>
                </td>
                <td>{item.subject}</td>
                <td>
                  {item.jira ? (
                    <span className="jira-tag">{item.jira}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
