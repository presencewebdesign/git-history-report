# Git Commit Report

Analyse Git commit history for any team or repository over a given date range. Generates colour-coded terminal reports **and** an interactive web dashboard with charts.

![Bash](https://img.shields.io/badge/Bash-4.0%2B-green)
![Node](https://img.shields.io/badge/Node-18%2B-blue)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## Features

- **Terminal report** — a single shell script that prints a rich, colour-coded analysis directly in your terminal.
- **Web dashboard** — a React + Chart.js app served by a lightweight Express backend for interactive exploration.
- **Zero external dependencies for the CLI** — only requires Git and Bash.
- **Flexible date ranges** — supports ISO dates (`2024-01-01`) and natural language (`30 days ago`).
- **Team filtering** — analyse specific team members or automatically discover all contributors.
- **Ticket tracking** — extract and count ticket references (JIRA, Linear, GitHub Issues, etc.) from commit messages.

### Report Sections

| Section | Description |
|---|---|
| **Total Commits** | Headline count of commits in the date range |
| **Commits by Author** | Horizontal bar chart per contributor |
| **Commit Activity** | Day-by-day activity graph |
| **File Change Statistics** | Unique files changed across all commits |
| **Top 10 Most Changed Files** | Most frequently touched files |
| **Lines Changed** | Insertions, deletions, and net lines |
| **Lines of Code by File Type** | Breakdown by file extension (top 15) |
| **Most Recent File Changes** | 15 most recently modified files with commit details |
| **Productivity Patterns** | Streaks, working hours, avg commit cadence per developer |
| **Developer Summary** | Tickets, commits, and commits-per-ticket ratio |
| **Ticket Breakdown** | Per-developer list of every ticket reference |

The web dashboard adds additional visualisations: commit size distribution, weekly velocity, code ownership, commits by day-of-week and hour, and lines changed per author.

---

## Quick Start

### Terminal Report (CLI)

```bash
git clone https://github.com/presencewebdesign/git-history-report.git
cd git-history-report

# Run against any local repo
bash show-commits.sh '30 days ago' 'now' /path/to/repo
```

### Web Dashboard

```bash
cd web-app
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser, enter a repository path and date range, and click **Generate Report**.

---

## Prerequisites

- **Bash 4.0+** (macOS or Linux)
- **Git** on your `PATH`
- **Node.js 18+** and **npm** (for the web dashboard only)

---

## CLI Usage

```
bash show-commits.sh <start-date> <end-date> <repo-path>
```

**Examples:**

```bash
bash show-commits.sh '2024-01-01' '2024-12-31' /path/to/repo
bash show-commits.sh '30 days ago' 'now' /path/to/repo
bash show-commits.sh '1 year ago' 'now' .
```

Make the script executable to skip `bash`:

```bash
chmod +x show-commits.sh
./show-commits.sh '30 days ago' 'now' /path/to/repo
```

---

## Configuration

### Team Members

Open `show-commits.sh` and edit the `TEAM` array.

**Option A — Specific members:**

```bash
TEAM=(
    "alice:Alice Smith"
    "bob:Bob Jones\|bob-work"
)
```

Use `\|` to merge multiple Git identities for the same person.

**Option B — All authors (default):**

```bash
TEAM=()
```

When empty, the script automatically discovers every author who committed in the date range.

### Ticket Prefix

Set `TICKET_PREFIX` at the top of `show-commits.sh` to match your project tracker:

```bash
TICKET_PREFIX="PROJ-"   # e.g. "JIRA-", "ISSUE-", "LINEAR-"
```

For the web dashboard, enter the ticket prefix in the form when generating a report.

---

## Web Dashboard

The web dashboard lives in the `web-app/` directory and consists of:

- **Frontend** — React 18 + Vite + Chart.js
- **Backend** — Express server that runs `collect-data.sh` and returns JSON

### Running

```bash
cd web-app
npm install
npm run dev          # starts both frontend (port 5173) and backend (port 3001)
```

### Building for Production

```bash
cd web-app
npm run build        # outputs to web-app/dist/
npm run preview      # preview the production build
```

> **Note:** The backend server must be running for the dashboard to function. It executes Git commands on the server against the repository path you provide.

---

## Project Structure

```
.
├── show-commits.sh      # CLI terminal report
├── collect-data.sh      # Data collector (outputs JSON, used by the web backend)
├── web-app/
│   ├── server/
│   │   └── index.ts     # Express API server
│   ├── src/
│   │   ├── App.tsx      # Main React app
│   │   ├── components/  # Dashboard chart and card components
│   │   ├── types.ts     # TypeScript type definitions
│   │   └── styles/      # CSS styles
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Example Output (CLI)

```
═══════════════════════════════════════════════════════
📊 Git Commit Analysis: 30 days ago to now
═══════════════════════════════════════════════════════

📈 Total Commits: 74

👥 Commits by Author:
  ─────────────────────────────────────────────────────
  alice                42 ████████████████████████████████████████
  ─────────────────────────────────────────────────────
  bob                  28 ██████████████████████████
  ─────────────────────────────────────────────────────

📅 Commit Activity:
  2024-01-15 ▪▪▪▪▪ 5
  2024-01-16 ▪▪▪   3
  2024-01-17 ▪     1
```

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Commit your changes
4. Push and open a PR

---

## License

This project is open source under the [MIT License](LICENSE).

---

## Notes

- The `<repo-path>` argument can be an absolute or relative path to any local Git repository.
- Colour output uses ANSI escape codes — best viewed in a modern terminal (iTerm2, Terminal.app, Windows Terminal, etc.).
- Git author names are taken from commit metadata, which may differ from GitHub usernames or display names.
- The web dashboard is designed for **local use**. If you expose it on a network, be aware that it executes Git commands against local file paths provided by the user.
