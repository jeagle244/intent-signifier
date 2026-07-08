/**
 * Reverse-engineered from the source CSV by fitting all 364 rows against
 * their given LemFi Relevance Score (max error 0.05 across the full
 * dataset — clean weights, not curve-fitting noise). Recomputing from the
 * 5 sub-factors here (rather than trusting the CSV's score column as an
 * opaque value) keeps this retunable the same way lib/scoring/weights.ts is.
 */
export const RELEVANCE_WEIGHTS = {
  categoryFit: 0.28,
  marketOverlap: 0.27,
  productAdjacency: 0.15,
  talentPoachability: 0.12,
  growthHeat: 0.18,
} as const;

export interface RelevanceFactors {
  categoryFit: number;
  marketOverlap: number;
  productAdjacency: number;
  talentPoachability: number;
  growthHeat: number;
}

export function computeRelevanceScore(factors: RelevanceFactors): number {
  const w = RELEVANCE_WEIGHTS;
  return Math.round(
    factors.categoryFit * w.categoryFit +
      factors.marketOverlap * w.marketOverlap +
      factors.productAdjacency * w.productAdjacency +
      factors.talentPoachability * w.talentPoachability +
      factors.growthHeat * w.growthHeat
  );
}

/** Only these tiers consume scan budget — see plan doc for the cost/coverage tradeoff. */
export const ACTIVE_SCAN_TIERS = ["A — Priority", "B — Strong"];
