export interface TeamMember {
  username: string;
  pattern: string;
}

export interface Meta {
  startDate: string;
  endDate: string;
  repoPath: string;
  generatedAt: string;
  jiraKey: string;
}

export interface CommitByAuthor {
  author: string;
  commits: number;
}

export interface CommitActivity {
  date: string;
  commits: number;
}

export interface TopChangedFile {
  file: string;
  changes: number;
}

export interface FileStats {
  totalFilesChanged: number;
  topChangedFiles: TopChangedFile[];
}

export interface LinesChanged {
  files: number;
  insertions: number;
  deletions: number;
  net: number;
}

export interface LinesByFileType {
  extension: string;
  insertions: number;
  deletions: number;
  net: number;
}

export interface RecentFileChange {
  date: string;
  hash: string;
  file: string;
  subject: string;
  jira: string;
}

export interface CommitsByDayOfWeek {
  day: string;
  commits: number;
}

export interface CommitsByHour {
  hour: number;
  commits: number;
}

export interface JiraTicket {
  ticket: string;
  commits: number;
}

export interface Developer {
  author: string;
  commits: number;
  streak: number;
  firstHour: string;
  lastHour: string;
  avgTimeBetweenCommits: string;
  avgMinutes: number;
  tickets: number;
  commitsPerTicket: number;
  jiraBreakdown: JiraTicket[];
}

export interface DetailedCommit {
  hash: string;
  author: string;
  subject: string;
  jira: string;
}

export interface DetailedCommitDay {
  date: string;
  dayOfWeek: string;
  commits: DetailedCommit[];
}

export interface CommitSizeDistribution {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

export interface WeeklyVelocity {
  week: string;
  commits: number;
}

export interface CodeOwnershipAuthor {
  author: string;
  commits: number;
}

export interface CodeOwnershipFile {
  file: string;
  totalCommits: number;
  authors: CodeOwnershipAuthor[];
}

export interface CommitMessageStats {
  total: number;
  withTicketRef: number;
  avgLength: number;
  avgWords: number;
}

export interface LinesByAuthor {
  author: string;
  insertions: number;
  deletions: number;
}

export interface ReportData {
  meta: Meta;
  totalCommits: number;
  commitsByAuthor: CommitByAuthor[];
  commitActivity: CommitActivity[];
  fileStats: FileStats;
  linesChanged: LinesChanged;
  linesByFileType: LinesByFileType[];
  recentFileChanges: RecentFileChange[];
  commitsByDayOfWeek: CommitsByDayOfWeek[];
  commitsByHour: CommitsByHour[];
  developers: Developer[];
  detailedCommits: DetailedCommitDay[];
  commitSizeDistribution: CommitSizeDistribution;
  weeklyVelocity: WeeklyVelocity[];
  codeOwnership: CodeOwnershipFile[];
  commitMessageStats: CommitMessageStats;
  linesByAuthor: LinesByAuthor[];
}
