import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, "../../collect-data.sh");
const REPO_CACHE_DIR = path.resolve(__dirname, "../.repo-cache");
const COMMAND_TIMEOUT_MS = 5 * 60 * 1000;

const app = express();
app.use(cors());
app.use(express.json());

function execFileAsync(
  file: string,
  args: string[],
  options: { maxBuffer?: number; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function isHttpsGitUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function normalisePublicRepoUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function looksLikeUnsupportedRemote(input: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(input) || /^git@[^:]+:/i.test(input);
}

async function setHeadToRemoteDefault(repoPath: string) {
  await execFileAsync("git", ["-C", repoPath, "remote", "set-head", "origin", "-a"], {
    timeout: COMMAND_TIMEOUT_MS,
  }).catch(() => undefined);

  const { stdout } = await execFileAsync(
    "git",
    ["-C", repoPath, "symbolic-ref", "refs/remotes/origin/HEAD"],
    { timeout: COMMAND_TIMEOUT_MS },
  );
  const remoteHeadRef = stdout.trim();
  if (!remoteHeadRef.startsWith("refs/remotes/origin/")) {
    throw new Error("Could not determine remote default branch");
  }

  await execFileAsync("git", ["-C", repoPath, "symbolic-ref", "HEAD", remoteHeadRef], {
    timeout: COMMAND_TIMEOUT_MS,
  });
}

async function resolveRepoInput(repoInput: string): Promise<{ path: string; display: string; isRemote: boolean }> {
  if (!isHttpsGitUrl(repoInput)) {
    if (looksLikeUnsupportedRemote(repoInput)) {
      throw new Error("Only HTTPS public Git URLs are supported for remote repositories");
    }
    return { path: repoInput, display: repoInput, isRemote: false };
  }

  const repoUrl = normalisePublicRepoUrl(repoInput);
  const cacheKey = crypto.createHash("sha256").update(repoUrl).digest("hex");
  const cachedPath = path.join(REPO_CACHE_DIR, cacheKey);

  await fs.mkdir(REPO_CACHE_DIR, { recursive: true });

  const gitDir = path.join(cachedPath, ".git");
  const hasCache = await fs.access(gitDir).then(() => true).catch(() => false);

  if (!hasCache) {
    await fs.rm(cachedPath, { recursive: true, force: true });
    try {
      await execFileAsync("git", ["clone", "--filter=blob:none", "--no-checkout", repoUrl, cachedPath], {
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (firstError) {
      await fs.rm(cachedPath, { recursive: true, force: true });
      try {
        await execFileAsync("git", ["clone", "--no-checkout", repoUrl, cachedPath], {
          timeout: COMMAND_TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024,
        });
      } catch (fallbackError: any) {
        const stderr = fallbackError?.stderr || fallbackError?.error?.message || "Failed to clone repository";
        throw new Error(stderr);
      }
    }
  } else {
    await execFileAsync("git", ["-C", cachedPath, "fetch", "--prune", "origin"], {
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  await setHeadToRemoteDefault(cachedPath);
  return { path: cachedPath, display: repoUrl, isRemote: true };
}

interface TeamMember {
  username: string;
  pattern: string;
}

app.post("/api/authors", async (req, res) => {
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

  try {
    const resolvedRepo = await resolveRepoInput(repoPath);
    const gitArgs = [
      "-C", resolvedRepo.path,
      "log",
      `--since=${since}`,
      `--until=${until}`,
      "--pretty=format:%an\t%ae",
    ];

    const { stdout } = await execFileAsync("git", gitArgs, {
      maxBuffer: 5 * 1024 * 1024,
      timeout: COMMAND_TIMEOUT_MS,
    });

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
  } catch (err: any) {
    res.status(500).json({ error: err?.stderr || err?.error?.message || err?.message || "Failed to load authors" });
  }
});

app.post("/api/report", async (req, res) => {
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

  try {
    const resolvedRepo = await resolveRepoInput(repoPath);
    const args = [SCRIPT_PATH, startDate, endDate, resolvedRepo.path];
    if (jiraKey) args.push(jiraKey);

    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    if (team && team.length > 0) {
      env.TEAM_CONFIG = team
        .filter((m) => m.username.trim() && m.pattern.trim())
        .map((m) => `${m.username.trim()}:${m.pattern.trim()}`)
        .join("\n");
    }

    const { stdout } = await execFileAsync("bash", args, {
      maxBuffer: 10 * 1024 * 1024,
      env,
      timeout: COMMAND_TIMEOUT_MS,
    });

    try {
      const data = JSON.parse(stdout);
      if (resolvedRepo.isRemote) {
        data.meta.repoPath = resolvedRepo.display;
        data.meta.repoCachePath = resolvedRepo.path;
      }
      res.json(data);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw output (first 500 chars):", stdout.substring(0, 500));
      res.status(500).json({ error: "Failed to parse script output as JSON" });
    }
  } catch (err: any) {
    const errorMessage = err?.stderr || err?.error?.message || err?.message || "Failed to generate report";
    console.error("Report error:", errorMessage);
    res.status(500).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
