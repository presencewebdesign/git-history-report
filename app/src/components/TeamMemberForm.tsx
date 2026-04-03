import { useState } from "react";
import type { TeamMember } from "../types";

interface DiscoveredAuthor {
  name: string;
  email: string;
  commits: number;
  selected: boolean;
}

interface Props {
  team: TeamMember[];
  onChange: (team: TeamMember[]) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  repoPath: string;
  startDate: string;
  endDate: string;
}

export default function TeamMemberForm({
  team,
  onChange,
  enabled,
  onToggle,
  repoPath,
  startDate,
  endDate,
}: Props) {
  const [discovered, setDiscovered] = useState<DiscoveredAuthor[]>([]);
  const [showDiscover, setShowDiscover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addMember() {
    onChange([...team, { username: "", pattern: "" }]);
  }

  function removeMember(index: number) {
    onChange(team.filter((_, i) => i !== index));
  }

  function updateMember(index: number, field: keyof TeamMember, value: string) {
    const updated = team.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    );
    onChange(updated);
  }

  async function discoverAuthors() {
    if (!repoPath.trim()) {
      setError("Enter a repository path first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, repoPath }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error);
      }
      const data = await res.json();

      const existingPatterns = new Set(
        team.map((m) => m.pattern.toLowerCase())
      );

      setDiscovered(
        data.authors.map((a: { name: string; email: string; commits: number }) => ({
          ...a,
          selected: existingPatterns.has(a.name.toLowerCase()),
        }))
      );
      setShowDiscover(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover authors");
    } finally {
      setLoading(false);
    }
  }

  function toggleAuthor(index: number) {
    setDiscovered((prev) =>
      prev.map((a, i) => (i === index ? { ...a, selected: !a.selected } : a))
    );
  }

  function selectAll() {
    setDiscovered((prev) => prev.map((a) => ({ ...a, selected: true })));
  }

  function selectNone() {
    setDiscovered((prev) => prev.map((a) => ({ ...a, selected: false })));
  }

  function applySelection() {
    const selected = discovered.filter((a) => a.selected);
    const newTeam: TeamMember[] = selected.map((a) => ({
      username: a.name,
      pattern: a.name,
    }));
    onChange(newTeam);
    setShowDiscover(false);
  }

  return (
    <div className="team-section">
      <div className="team-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              onToggle(e.target.checked);
              if (e.target.checked && team.length === 0) addMember();
            }}
          />
          <span className="toggle-switch" />
          <span>Filter by team members</span>
        </label>
        <span className="team-hint">
          {enabled
            ? "Only commits from these authors will be analysed"
            : "All authors in the repository will be analysed"}
        </span>
      </div>

      {enabled && (
        <div className="team-list">
          <button
            type="button"
            className="team-discover"
            onClick={discoverAuthors}
            disabled={loading}
          >
            {loading ? "Scanning..." : "Discover authors from repo"}
          </button>

          {error && <div className="team-error">{error}</div>}

          {showDiscover && (
            <div className="discover-panel">
              <div className="discover-header">
                <span className="discover-title">
                  {discovered.length} author{discovered.length !== 1 ? "s" : ""} found
                </span>
                <div className="discover-actions">
                  <button type="button" className="discover-link" onClick={selectAll}>
                    All
                  </button>
                  <button type="button" className="discover-link" onClick={selectNone}>
                    None
                  </button>
                </div>
              </div>
              <div className="discover-list">
                {discovered.map((author, i) => (
                  <label className="discover-row" key={`${author.name}-${author.email}`}>
                    <input
                      type="checkbox"
                      checked={author.selected}
                      onChange={() => toggleAuthor(i)}
                    />
                    <span className="discover-name">{author.name}</span>
                    <span className="discover-email">{author.email}</span>
                    <span className="discover-commits">
                      {author.commits} commit{author.commits !== 1 ? "s" : ""}
                    </span>
                  </label>
                ))}
              </div>
              <div className="discover-footer">
                <button type="button" className="team-add" onClick={applySelection}>
                  Use {discovered.filter((a) => a.selected).length} selected as team
                </button>
                <button
                  type="button"
                  className="discover-link"
                  onClick={() => setShowDiscover(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showDiscover && (
            <>
              {team.map((member, i) => (
                <div className="team-row" key={i}>
                  <input
                    className="team-input"
                    value={member.username}
                    onChange={(e) => updateMember(i, "username", e.target.value)}
                    placeholder="Username (e.g. jsmith)"
                  />
                  <input
                    className="team-input team-input-wide"
                    value={member.pattern}
                    onChange={(e) => updateMember(i, "pattern", e.target.value)}
                    placeholder="Git author pattern (e.g. John Smith\|jsmith)"
                  />
                  <button
                    type="button"
                    className="team-remove"
                    onClick={() => removeMember(i)}
                    title="Remove member"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="team-add" onClick={addMember}>
                + Add team member
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
