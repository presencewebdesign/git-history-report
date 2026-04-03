import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, "../../collect-data.sh");

const app = express();
app.use(cors());
app.use(express.json());

interface TeamMember {
  username: string;
  pattern: string;
}

app.post("/api/authors", (req, res) => {
  const { startDate, endDate, repoPath } = req.body as {
    startDate: string;
    endDate: string;
    repoPath: string;
  };

  if (!repoPath) {
    res.status(400).json({ error: "repoPath is required" });
    return;
  }

  const since = startDate || "1 year ago";
  const until = endDate || "now";

  const gitArgs = [
    "-C", repoPath,
    "log",
    `--since=${since}`,
    `--until=${until}`,
    "--pretty=format:%an\t%ae",
  ];

  execFile("git", gitArgs, { maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: stderr || error.message });
      return;
    }

    const seen = new Map<string, { name: string; email: string; commits: number }>();
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      const [name, email] = line.split("\t");
      const key = `${name}<${email}>`;
      const entry = seen.get(key);
      if (entry) {
        entry.commits++;
      } else {
        seen.set(key, { name, email, commits: 1 });
      }
    }

    const authors = [...seen.values()].sort((a, b) => b.commits - a.commits);
    res.json({ authors });
  });
});

app.post("/api/report", (req, res) => {
  const { startDate, endDate, repoPath, jiraKey, team } = req.body as {
    startDate: string;
    endDate: string;
    repoPath: string;
    jiraKey?: string;
    team?: TeamMember[];
  };

  if (!startDate || !endDate || !repoPath) {
    res.status(400).json({ error: "startDate, endDate, and repoPath are required" });
    return;
  }

  const args = [SCRIPT_PATH, startDate, endDate, repoPath];
  if (jiraKey) args.push(jiraKey);

  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (team && team.length > 0) {
    env.TEAM_CONFIG = team
      .filter((m) => m.username.trim() && m.pattern.trim())
      .map((m) => `${m.username.trim()}:${m.pattern.trim()}`)
      .join("\n");
  }

  execFile("bash", args, { maxBuffer: 10 * 1024 * 1024, env }, (error, stdout, stderr) => {
    if (error) {
      console.error("Script error:", stderr || error.message);
      res.status(500).json({ error: stderr || error.message });
      return;
    }

    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw output (first 500 chars):", stdout.substring(0, 500));
      res.status(500).json({ error: "Failed to parse script output as JSON" });
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
