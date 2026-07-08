import { SCORING_WEIGHTS } from "@/lib/scoring/weights";
import { SubScores } from "@/lib/types";
import { Card } from "@/components/ui/Card";

const LABELS: Record<keyof SubScores, string> = {
  layoffs: "Recent layoffs",
  leadershipExits: "Leadership exits",
  negativePress: "Negative press",
  glassdoorTrend: "Glassdoor trend",
  fundingDistress: "Funding distress",
};

export function SubScoreBreakdown({ subScores }: { subScores: SubScores }) {
  const rows = (Object.keys(LABELS) as (keyof SubScores)[]).map((key) => ({
    key,
    label: LABELS[key],
    weight: SCORING_WEIGHTS[key],
    value: subScores[key],
  }));

  return (
    <Card className="p-5">
      <h2 className="font-bold text-lg mb-4">Intent sub-score breakdown</h2>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-medium">
                {row.label}{" "}
                <span className="text-ink/40 text-xs">({Math.round(row.weight * 100)}% weight)</span>
              </span>
              <span className="text-sm font-bold">
                {row.value === null ? (
                  <span className="text-ink/40 font-normal">Insufficient data</span>
                ) : (
                  row.value
                )}
              </span>
            </div>
            <div className="h-2 rounded-full bg-cream hard-border overflow-hidden">
              {row.value !== null && (
                <div
                  className="h-full bg-lime"
                  style={{ width: `${row.value}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
