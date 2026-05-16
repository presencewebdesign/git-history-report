# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-05-16

### Added

- **Local folder picker** — Browse button opens your OS folder dialog (macOS, Linux, Windows) and fills the repository path automatically.
- **Repository source toggle** — Switch between **Local path** and **Public URL** when generating a report.
- **Public URL validation** — Remote URLs are checked before you run a report. Accessible public repos show a green valid state; private or unreachable repos show red with a clear error message.
- **Local server routes** — The dashboard’s own Express backend exposes `POST /api/browse-folder` and `POST /api/validate-repo` on localhost only. These are not third-party or cloud APIs; the UI talks to your local dev server. Folder selection stays on your machine. For public URLs, validation runs `git ls-remote` against the repo host you entered—no repo data is uploaded elsewhere.

### Changed

- Report form layout and styling updated for the new repository source controls and validation feedback.

## [1.0.0] - Initial release

- Interactive Git commit dashboard (React + Chart.js + Express).
- Flexible date ranges, team filtering, and ticket tracking from commit messages.
- Export reports to Excel.
- CLI and dashboard support for analysing local repositories.

[1.1.0]: https://github.com/presencewebdesign/git-history-report/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/presencewebdesign/git-history-report/releases/tag/v1.0.0
