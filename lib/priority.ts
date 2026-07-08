export const PRIORITY_WEIGHTS = { relevance: 0.5, intent: 0.5 } as const;

/**
 * Missing intent is treated as a literal 0 contribution, NOT renormalized
 * away to pure relevance. Renormalizing would let a company with a real
 * but modest detected signal (e.g. an unspecified layoff, worth 35 raw
 * points) score lower than a company with no signal at all once blended
 * with relevance — backwards. Treating missing intent as 0 means any
 * detected signal only ever helps, never hurts, relative to no signal.
 */
export function computePriorityScore(relevanceScore: number, intentScore: number | null): number {
  return Math.round(
    PRIORITY_WEIGHTS.relevance * relevanceScore + PRIORITY_WEIGHTS.intent * (intentScore ?? 0)
  );
}
