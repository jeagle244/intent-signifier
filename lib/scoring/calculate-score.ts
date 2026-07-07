import { SCORING_WEIGHTS } from "./weights";
import { DetectedSignal } from "./signal-types";
import { SignalCategory, SubScores } from "@/lib/types";

export interface CategorySignals {
  layoffs: DetectedSignal | null;
  leadershipExits: DetectedSignal | null;
  negativePress: DetectedSignal | null;
  glassdoorTrend: DetectedSignal | null;
  fundingDistress: DetectedSignal | null;
}

export interface ScoreResult {
  compositeScore: number | null;
  subScores: SubScores;
  whySummary: string | null;
  /** The category with the highest weighted contribution, for sourcing-angle generation. Null if no signal at all. */
  primaryCategory: SignalCategory | null;
}

function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/**
 * Composite renormalizes over only the categories that have a detected
 * signal, so a company with 2/5 signals isn't unfairly dragged toward
 * zero relative to one with 5/5. If nothing was detected at all, the
 * composite stays null — the UI must render "insufficient data", never
 * a fabricated 0 or mid-value.
 */
export function calculateScore(signals: CategorySignals): ScoreResult {
  const categories = Object.keys(SCORING_WEIGHTS) as (keyof typeof SCORING_WEIGHTS)[];

  const subScores = {} as SubScores;
  let weightedSum = 0;
  let weightTotal = 0;
  let best: { weightedPoints: number; detail: string; category: SignalCategory } | null = null;

  for (const category of categories) {
    const signal = signals[category];
    if (!signal) {
      subScores[category] = null;
      continue;
    }

    subScores[category] = signal.points;
    const weight = SCORING_WEIGHTS[category];
    weightedSum += weight * signal.points;
    weightTotal += weight;

    const weightedPoints = weight * signal.points;
    if (!best || weightedPoints > best.weightedPoints) {
      best = { weightedPoints, detail: signal.detail, category };
    }
  }

  const compositeScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null;
  const whySummary = best?.detail ? truncate(best.detail) : null;

  return { compositeScore, subScores, whySummary, primaryCategory: best?.category ?? null };
}
