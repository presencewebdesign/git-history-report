import * as XLSX from "xlsx";
import type { ReportData } from "./types";

export function exportReportToExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();

  // --- Summary ---
  const summary = [
    ["Git Commit Report"],
    [],
    ["Period", `${data.meta.startDate} → ${data.meta.endDate}`],
    ["Repository", data.meta.repoPath],
    ["Generated", data.meta.generatedAt],
    ["JIRA Key", data.meta.jiraKey || "N/A"],
    [],
    ["Total Commits", data.totalCommits],
    ["Contributors", data.commitsByAuthor.length],
    ["Files Changed", data.fileStats.totalFilesChanged],
    ["Insertions", data.linesChanged.insertions],
    ["Deletions", data.linesChanged.deletions],
    ["Net Lines", data.linesChanged.net],
    [],
    ["Commit Size Distribution"],
    ["Small (1-10 lines)", data.commitSizeDistribution.small],
    ["Medium (11-50 lines)", data.commitSizeDistribution.medium],
    ["Large (51-200 lines)", data.commitSizeDistribution.large],
    ["X-Large (200+ lines)", data.commitSizeDistribution.xlarge],
    [],
    ["Commit Message Stats"],
    ["Total Messages", data.commitMessageStats.total],
    ["With Ticket Ref", data.commitMessageStats.withTicketRef],
    ["Avg Length (chars)", data.commitMessageStats.avgLength],
    ["Avg Words", data.commitMessageStats.avgWords],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // --- Commits by Author ---
  const authorRows = data.commitsByAuthor.map((a) => ({
    Author: a.author,
    Commits: a.commits,
  }));
  appendSheet(wb, authorRows, "Commits by Author");

  // --- Commit Activity ---
  const activityRows = data.commitActivity.map((a) => ({
    Date: a.date,
    Commits: a.commits,
  }));
  appendSheet(wb, activityRows, "Daily Activity");

  // --- Weekly Velocity ---
  const weeklyRows = data.weeklyVelocity.map((w) => ({
    Week: w.week,
    Commits: w.commits,
  }));
  appendSheet(wb, weeklyRows, "Weekly Velocity");

  // --- Commits by Day of Week ---
  const dayRows = data.commitsByDayOfWeek.map((d) => ({
    Day: d.day,
    Commits: d.commits,
  }));
  appendSheet(wb, dayRows, "By Day of Week");

  // --- Commits by Hour ---
  const hourRows = data.commitsByHour.map((h) => ({
    Hour: `${String(h.hour).padStart(2, "0")}:00`,
    Commits: h.commits,
  }));
  appendSheet(wb, hourRows, "By Hour");

  // --- Top Changed Files ---
  const topFileRows = data.fileStats.topChangedFiles.map((f) => ({
    File: f.file,
    Changes: f.changes,
  }));
  appendSheet(wb, topFileRows, "Top Files");

  // --- Lines by File Type ---
  const fileTypeRows = data.linesByFileType.map((ft) => ({
    Extension: ft.extension,
    Insertions: ft.insertions,
    Deletions: ft.deletions,
    Net: ft.net,
  }));
  appendSheet(wb, fileTypeRows, "Lines by File Type");

  // --- Lines by Author ---
  const linesByAuthorRows = data.linesByAuthor.map((la) => ({
    Author: la.author,
    Insertions: la.insertions,
    Deletions: la.deletions,
  }));
  appendSheet(wb, linesByAuthorRows, "Lines by Author");

  // --- Code Ownership ---
  const ownershipRows: Record<string, string | number>[] = [];
  for (const file of data.codeOwnership) {
    for (const author of file.authors) {
      ownershipRows.push({
        File: file.file,
        "Total Commits": file.totalCommits,
        Author: author.author,
        "Author Commits": author.commits,
      });
    }
  }
  appendSheet(wb, ownershipRows, "Code Ownership");

  // --- Developers ---
  const devRows = data.developers.map((d) => ({
    Author: d.author,
    Commits: d.commits,
    "Streak (days)": d.streak,
    "First Hour": d.firstHour,
    "Last Hour": d.lastHour,
    "Avg Time Between": d.avgTimeBetweenCommits,
    "Avg Minutes": d.avgMinutes,
    Tickets: d.tickets,
    "Commits/Ticket": d.commitsPerTicket,
  }));
  appendSheet(wb, devRows, "Developers");

  // --- JIRA Breakdown ---
  const jiraRows: Record<string, string | number>[] = [];
  for (const dev of data.developers) {
    for (const ticket of dev.jiraBreakdown) {
      jiraRows.push({
        Author: dev.author,
        Ticket: ticket.ticket,
        Commits: ticket.commits,
      });
    }
  }
  if (jiraRows.length > 0) {
    appendSheet(wb, jiraRows, "JIRA Breakdown");
  }

  // --- Recent File Changes ---
  const recentRows = data.recentFileChanges.map((r) => ({
    Date: r.date,
    Hash: r.hash,
    File: r.file,
    Subject: r.subject,
    JIRA: r.jira,
  }));
  appendSheet(wb, recentRows, "Recent Changes");

  // --- Detailed Commits ---
  const detailedRows: Record<string, string>[] = [];
  for (const day of data.detailedCommits) {
    for (const c of day.commits) {
      detailedRows.push({
        Date: day.date,
        Day: day.dayOfWeek,
        Hash: c.hash,
        Author: c.author,
        Subject: c.subject,
        JIRA: c.jira,
      });
    }
  }
  appendSheet(wb, detailedRows, "All Commits");

  const repoName = data.meta.repoPath.split("/").pop() || "repo";
  const dateRange = `${data.meta.startDate}_${data.meta.endDate}`.replace(
    /\s+/g,
    "-",
  );
  const filename = `git-report_${repoName}_${dateRange}.xlsx`;

  XLSX.writeFile(wb, filename);
}

function appendSheet(
  wb: XLSX.WorkBook,
  rows: Record<string, string | number>[],
  name: string,
) {
  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["No data"]]);
    XLSX.utils.book_append_sheet(wb, ws, name);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const cols = Object.keys(rows[0]);
  ws["!cols"] = cols.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...rows.map((r) => String(r[col] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  XLSX.utils.book_append_sheet(wb, ws, name);
}
