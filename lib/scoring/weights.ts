/**
 * v1 scoring weights. Retune here — nothing else needs to change.
 * Composite score renormalizes over whichever categories have data,
 * so weights don't need to be adjusted just because a category is
 * sometimes null (see calculate-score.ts).
 */
export const SCORING_WEIGHTS = {
  layoffs: 0.3,
  leadershipExits: 0.2,
  negativePress: 0.2,
  glassdoorTrend: 0.15,
  fundingDistress: 0.15,
} as const;

/** Slack alert thresholds, also trivial to retune. */
export const ALERT_CONFIG = {
  topNThreshold: 10,
  scoreJumpThreshold: 15,
} as const;
