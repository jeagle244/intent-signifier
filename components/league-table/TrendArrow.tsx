import { Trend } from "@/lib/types";

const CONFIG: Record<Trend, { symbol: string; label: string; className: string }> = {
  up: { symbol: "↑", label: "Trending up vs last refresh", className: "text-purple" },
  down: { symbol: "↓", label: "Trending down vs last refresh", className: "text-ink/40" },
  flat: { symbol: "→", label: "No change vs last refresh", className: "text-ink/40" },
  new: { symbol: "•", label: "New this refresh", className: "text-ink/40" },
};

export function TrendArrow({ trend }: { trend: Trend }) {
  const { symbol, label, className } = CONFIG[trend];
  return (
    <span title={label} className={`font-bold text-lg ${className}`}>
      {symbol}
    </span>
  );
}
