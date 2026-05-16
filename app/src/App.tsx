import { useState } from "react";
import "./chartSetup";
import type { ReportData, TeamMember } from "./types";
import DateRangePicker from "./components/DateRangePicker";
import CommitsByAuthorChart from "./components/CommitsByAuthorChart";
import CommitActivityChart from "./components/CommitActivityChart";
import TopFilesChart from "./components/TopFilesChart";
import LinesByFileTypeChart from "./components/LinesByFileTypeChart";
import CommitsByDayChart from "./components/CommitsByDayChart";
import CommitsByHourChart from "./components/CommitsByHourChart";
import DeveloperCards from "./components/DeveloperCards";
import RecentChangesTable from "./components/RecentChangesTable";
import JiraBreakdown from "./components/JiraBreakdown";
import DetailedCommits from "./components/DetailedCommits";
import TeamMemberForm from "./components/TeamMemberForm";
import CommitSizeChart from "./components/CommitSizeChart";
import WeeklyVelocityChart from "./components/WeeklyVelocityChart";
import CodeOwnershipChart from "./components/CodeOwnershipChart";
import CommitMessageStatsCard from "./components/CommitMessageStatsCard";
import LinesByAuthorChart from "./components/LinesByAuthorChart";
import { exportReportToExcel } from "./exportToExcel";

type AppState = "form" | "loading" | "report" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("30 days ago");
  const [endDate, setEndDate] = useState("now");
  const [repoPath, setRepoPath] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [filterByTeam, setFilterByTeam] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");

    const activeTeam = filterByTeam
      ? team.filter((m) => m.username.trim() && m.pattern.trim())
      : [];

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          repoPath,
          jiraKey,
          team: activeTeam,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data: ReportData = await res.json();
      setReport(data);
      setState("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  function handleReset() {
    setState("form");
    setReport(null);
    setError("");
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Git Commit Report</h1>
        <p className="subtitle">
          Analyse developer activity across your repository
        </p>
      </header>

      {state === "form" && (
        <form className="setup-form" onSubmit={handleSubmit}>
          <h2>Configure Report</h2>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
          <div className="form-group">
            <label>Repository Path or Public URL</label>
            <input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/absolute/path/to/repo or https://github.com/owner/repo"
              required
            />
          </div>
          <div className="form-group">
            <label>JIRA Project Key (optional)</label>
            <input
              value={jiraKey}
              onChange={(e) => setJiraKey(e.target.value)}
              placeholder="e.g. PROJ"
            />
          </div>

          <TeamMemberForm
            team={team}
            onChange={setTeam}
            enabled={filterByTeam}
            onToggle={setFilterByTeam}
            repoPath={repoPath}
            startDate={startDate}
            endDate={endDate}
          />

          <button type="submit" className="btn-primary">
            Generate Report
          </button>
        </form>
      )}

      {state === "loading" && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">
            Analysing git history... this may take a moment for large or remote repos.
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="error-container">
          <p>{error}</p>
          <button className="btn-secondary" onClick={handleReset}>
            Back
          </button>
        </div>
      )}

      {state === "report" && report && <Dashboard data={report} onReset={handleReset} />}
    </div>
  );
}

function Dashboard({ data, onReset }: { data: ReportData; onReset: () => void }) {
  return (
    <>
      <div className="meta-bar">
        <div className="meta-item">
          <strong>{data.meta.startDate}</strong> → <strong>{data.meta.endDate}</strong>
        </div>
        <div className="meta-item">
          Repo: <strong className="mono">{data.meta.repoPath}</strong>
        </div>
        <div className="meta-item">
          Generated: <strong>{new Date(data.meta.generatedAt).toLocaleString()}</strong>
        </div>
        <div className="meta-actions">
          <button className="btn-export" onClick={() => exportReportToExcel(data)}>
            Export to Excel
          </button>
          <button className="btn-reset" onClick={onReset}>
            New Report
          </button>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card stat-blue">
          <div className="stat-value">{data.totalCommits.toLocaleString()}</div>
          <div className="stat-label">Total Commits</div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-value">{data.commitsByAuthor.length}</div>
          <div className="stat-label">Contributors</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-value">
            {data.fileStats.totalFilesChanged.toLocaleString()}
          </div>
          <div className="stat-label">Files Changed</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-value">
            +{data.linesChanged.insertions.toLocaleString()}
          </div>
          <div className="stat-label">Insertions</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-value">
            -{data.linesChanged.deletions.toLocaleString()}
          </div>
          <div className="stat-label">Deletions</div>
        </div>
      </div>

      <div className="chart-grid">
        <CommitsByAuthorChart data={data.commitsByAuthor} />
        <CommitSizeChart data={data.commitSizeDistribution} />
        <CommitActivityChart data={data.commitActivity} />
        <WeeklyVelocityChart data={data.weeklyVelocity} />
        <CommitsByDayChart data={data.commitsByDayOfWeek} />
        <CommitsByHourChart data={data.commitsByHour} />
        <TopFilesChart data={data.fileStats.topChangedFiles} />
        <CommitMessageStatsCard data={data.commitMessageStats} jiraKey={data.meta.jiraKey} />
        <LinesByFileTypeChart data={data.linesByFileType} />
        <LinesByAuthorChart data={data.linesByAuthor} />
        <CodeOwnershipChart data={data.codeOwnership} />
        <DeveloperCards data={data.developers} />
        <RecentChangesTable data={data.recentFileChanges} />
        <JiraBreakdown developers={data.developers} />
        <DetailedCommits data={data.detailedCommits} />
      </div>
    </>
  );
}
