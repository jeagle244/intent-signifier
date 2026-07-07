export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  if (score === null) {
    return (
      <span className={`inline-block rounded-full border-[1.5px] border-dashed border-ink/40 text-ink/50 font-medium ${dims}`}>
        Insufficient data
      </span>
    );
  }

  let tone = "bg-white text-ink hard-border";
  if (score >= 80) tone = "bg-ink text-lime hard-border";
  else if (score >= 60) tone = "bg-purple text-white hard-border";
  else if (score >= 40) tone = "bg-lime text-ink hard-border";

  return <span className={`inline-block rounded-full font-bold ${tone} ${dims}`}>{score}</span>;
}
