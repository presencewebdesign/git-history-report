import { useState } from "react";

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
}

type Mode = "calendar" | "text";

const PRESETS = [
  { label: "Last 7 days", start: "7 days ago", end: "now" },
  { label: "Last 30 days", start: "30 days ago", end: "now" },
  { label: "Last 90 days", start: "90 days ago", end: "now" },
  { label: "Last 6 months", start: "6 months ago", end: "now" },
  { label: "Last year", start: "1 year ago", end: "now" },
  { label: "This year", start: new Date().getFullYear() + "-01-01", end: "now" },
];

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isISODate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: Props) {
  const [mode, setMode] = useState<Mode>(
    isISODate(startDate) ? "calendar" : "text"
  );

  function switchToCalendar() {
    setMode("calendar");
    if (!isISODate(startDate)) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      onStartChange(toISODate(d));
    }
    if (!isISODate(endDate)) {
      onEndChange(toISODate(new Date()));
    }
  }

  function switchToText() {
    setMode("text");
  }

  function applyPreset(start: string, end: string) {
    onStartChange(start);
    onEndChange(end);
    if (isISODate(start)) {
      setMode("calendar");
    } else {
      setMode("text");
    }
  }

  return (
    <div className="date-picker-section">
      <div className="date-picker-header">
        <div className="date-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === "calendar" ? "active" : ""}`}
            onClick={switchToCalendar}
          >
            Calendar
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "text" ? "active" : ""}`}
            onClick={switchToText}
          >
            Text
          </button>
        </div>
      </div>

      <div className="date-presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`preset-btn ${startDate === p.start && endDate === p.end ? "active" : ""}`}
            onClick={() => applyPreset(p.start, p.end)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Start Date</label>
          {mode === "calendar" ? (
            <input
              type="date"
              className="date-input"
              value={isISODate(startDate) ? startDate : ""}
              onChange={(e) => onStartChange(e.target.value)}
              required
            />
          ) : (
            <input
              value={startDate}
              onChange={(e) => onStartChange(e.target.value)}
              placeholder="e.g. 30 days ago, 2024-01-01"
              required
            />
          )}
        </div>
        <div className="form-group">
          <label>End Date</label>
          {mode === "calendar" ? (
            <input
              type="date"
              className="date-input"
              value={isISODate(endDate) ? endDate : ""}
              onChange={(e) => onEndChange(e.target.value)}
              required
            />
          ) : (
            <input
              value={endDate}
              onChange={(e) => onEndChange(e.target.value)}
              placeholder="e.g. now, 2024-12-31"
              required
            />
          )}
        </div>
      </div>
    </div>
  );
}
