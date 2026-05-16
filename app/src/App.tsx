import { useState, useRef, useCallback } from "react";
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
type RepoSource = "local" | "url";
type ValidationState = "idle" | "validating" | "valid" | "invalid";

export default function App() {
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("30 days ago");
  const [endDate, setEndDate] = useState("now");
  const [repoSource, setRepoSource] = useState<RepoSource>("local");
  const [repoPath, setRepoPath] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [urlValidation, setUrlValidation] = useState<ValidationState>("idle");
  const [urlError, setUrlError] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [filterByTeam, setFilterByTeam] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const validateTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const effectiveRepoPath = repoSource === "local" ? repoPath : repoUrl;

  const validateUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      setUrlValidation("idle");
      setUrlError("");
      return;
    }

    try {
      new URL(url);
    } catch {
      setUrlValidation("invalid");
      setUrlError("Please enter a valid URL (e.g. https://github.com/owner/repo)");
      return;
    }

    setUrlValidation("validating");
    setUrlError("");

    try {
      const res = await fetch("/api/validate-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.valid) {
        setUrlValidation("valid");
        setUrlError("");
      } else {
        setUrlValidation("invalid");
        setUrlError(data.error || "Could not access repository");
      }
    } catch {
      setUrlValidation("invalid");
      setUrlError("Failed to validate URL. Please check your connection.");
    }
  }, []);

  async function handleBrowseFolder() {
    setBrowsing(true);
    try {
      const res = await fetch("/api/browse-folder", { method: "POST" });
      const data = await res.json();
      if (!data.cancelled && data.path) {
        setRepoPath(data.path);
      }
    } catch {
      // dialog was cancelled or failed
    } finally {
      setBrowsing(false);
    }
  }

  function handleUrlChange(value: string) {
    setRepoUrl(value);
    setUrlValidation("idle");
    setUrlError("");

    if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
    if (value.trim()) {
      validateTimerRef.current = setTimeout(() => validateUrl(value), 800);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");

    if (repoSource === "url" && urlValidation !== "valid") {
      setError("Please enter a valid public repository URL and wait for validation.");
      setState("error");
      return;
    }

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
          repoPath: effectiveRepoPath,
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
            <label>Repository Source</label>
            <div className="repo-source-toggle">
              <button
                type="button"
                className={`source-btn ${repoSource === "local" ? "active" : ""}`}
                onClick={() => setRepoSource("local")}
              >
                Local Path
              </button>
              <button
                type="button"
                className={`source-btn ${repoSource === "url" ? "active" : ""}`}
                onClick={() => setRepoSource("url")}
              >
                Public URL
              </button>
            </div>

            {repoSource === "local" ? (
              <div className="repo-local-input">
                <div className="local-input-row">
                  <input
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="/absolute/path/to/repo"
                    required
                  />
                  <button
                    type="button"
                    className="browse-btn"
                    onClick={handleBrowseFolder}
                    disabled={browsing}
                    title="Browse for folder"
                  >
                    {browsing ? (
                      <span className="browse-spinner" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 5C2 3.89543 2.89543 3 4 3H7.17157C7.70201 3 8.21071 3.21071 8.58579 3.58579L9.41421 4.41421C9.78929 4.78929 10.298 5 10.8284 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="repo-hint">
                  Enter the path or browse to select a local git repository.
                </p>
              </div>
            ) : (
              <div className="repo-url-input">
                <div className={`url-input-wrapper ${urlValidation}`}>
                  <input
                    value={repoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    required
                  />
                  <span className="url-status-icon">
                    {urlValidation === "validating" && (
                      <span className="url-spinner" />
                    )}
                    {urlValidation === "valid" && (
                      <span className="url-check">&#10003;</span>
                    )}
                    {urlValidation === "invalid" && (
                      <span className="url-cross">&#10007;</span>
                    )}
                  </span>
                </div>
                {urlError && <p className="repo-error">{urlError}</p>}
                <p className="repo-hint repo-hint-warn">
                  Only public repositories are supported. Private repos will fail as authentication is not provided.
                </p>
              </div>
            )}
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
            repoPath={effectiveRepoPath}
            startDate={startDate}
            endDate={endDate}
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={repoSource === "url" && urlValidation !== "valid"}
          >
            {repoSource === "url" && urlValidation === "validating"
              ? "Validating repository..."
              : "Generate Report"}
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
