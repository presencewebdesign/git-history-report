import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.color = "#8b90a5";
ChartJS.defaults.borderColor = "rgba(42, 46, 66, 0.5)";
ChartJS.defaults.font.family = "'Inter', sans-serif";

export const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
