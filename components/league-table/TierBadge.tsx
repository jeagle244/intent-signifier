const TIER_STYLE: Record<string, string> = {
  "A — Priority": "bg-purple text-white",
  "B — Strong": "bg-lime text-ink",
  "C — Watch": "bg-white text-ink hard-border",
  "D — Low": "bg-cream text-ink/50 hard-border border-dashed",
};

export function TierBadge({ tier }: { tier: string }) {
  const letter = tier.charAt(0);
  const style = TIER_STYLE[tier] ?? "bg-white text-ink hard-border";
  return (
    <span
      title={tier}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${style}`}
    >
      {letter}
    </span>
  );
}
