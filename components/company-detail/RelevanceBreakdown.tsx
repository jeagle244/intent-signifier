import { RELEVANCE_WEIGHTS } from "@/lib/relevance";
import { RelevanceFactorScores } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/league-table/TierBadge";

const LABELS: Record<keyof RelevanceFactorScores, string> = {
  categoryFit: "Category fit",
  marketOverlap: "Market overlap",
  productAdjacency: "Product adjacency",
  talentPoachability: "Talent / stage poachability",
  growthHeat: "Growth / heat",
};

const WEIGHT_KEY: Record<keyof RelevanceFactorScores, keyof typeof RELEVANCE_WEIGHTS> = {
  categoryFit: "categoryFit",
  marketOverlap: "marketOverlap",
  productAdjacency: "productAdjacency",
  talentPoachability: "talentPoachability",
  growthHeat: "growthHeat",
};

interface Props {
  tier: string;
  category: string;
  relevanceScore: number;
  factors: RelevanceFactorScores;
  mainLocation: string | null;
  status: string | null;
  fundingStage: string | null;
  valuationBand: string | null;
  valuationNotes: string | null;
  competitiveNotes: string | null;
}

function SnapshotRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm py-1">
      <span className="text-ink/50">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function RelevanceBreakdown({
  tier,
  category,
  relevanceScore,
  factors,
  mainLocation,
  status,
  fundingStage,
  valuationBand,
  valuationNotes,
  competitiveNotes,
}: Props) {
  const rows = (Object.keys(LABELS) as (keyof RelevanceFactorScores)[]).map((key) => ({
    key,
    label: LABELS[key],
    weight: RELEVANCE_WEIGHTS[WEIGHT_KEY[key]],
    value: factors[key],
  }));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">LemFi relevance breakdown</h2>
        <div className="flex items-center gap-2">
          <TierBadge tier={tier} />
          <span className="font-bold text-lg">{relevanceScore}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-medium">
                {row.label}{" "}
                <span className="text-ink/40 text-xs">({Math.round(row.weight * 100)}% weight)</span>
              </span>
              <span className="text-sm font-bold">{row.value ?? "—"}</span>
            </div>
            <div className="h-2 rounded-full bg-cream hard-border overflow-hidden">
              {row.value !== null && <div className="h-full bg-purple" style={{ width: `${row.value}%` }} />}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-ink/10 pt-3">
        <SnapshotRow label="Category" value={category} />
        <SnapshotRow label="Location" value={mainLocation} />
        <SnapshotRow label="Status" value={status} />
        <SnapshotRow label="Funding stage" value={fundingStage} />
        <SnapshotRow label="Valuation" value={valuationBand} />
        <SnapshotRow label="Valuation notes" value={valuationNotes} />
      </div>

      {competitiveNotes && (
        <p className="text-sm text-ink/70 mt-3 pt-3 border-t border-ink/10">{competitiveNotes}</p>
      )}
    </Card>
  );
}
