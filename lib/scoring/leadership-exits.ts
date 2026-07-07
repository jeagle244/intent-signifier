import { LEADERSHIP_EXIT_KEYWORDS, LEADERSHIP_TITLE_PATTERN, extractSnippet } from "./keywords";
import { DetectedSignal, extractDate, extractFirstUrl } from "./signal-types";

const C_SUITE_PATTERN = /^(CEO|CTO|CFO|COO|CPO|CMO|Chief)/i;

/**
 * Requires BOTH a leadership title AND exit-language in the same text —
 * a lone title match is common in any article that merely quotes a CEO,
 * so title-only would false-positive constantly.
 */
export function detectLeadershipExit(text: string): DetectedSignal | null {
  const hasExitLanguage = LEADERSHIP_EXIT_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
  const titleMatch = text.match(LEADERSHIP_TITLE_PATTERN);
  if (!hasExitLanguage || !titleMatch) return null;

  const isCSuite = C_SUITE_PATTERN.test(titleMatch[0]);
  const points = isCSuite ? 100 : 60;
  const detail = extractSnippet(text, LEADERSHIP_EXIT_KEYWORDS) || extractSnippet(text, [titleMatch[0]]);

  return {
    points,
    detail: detail || `${titleMatch[0]} exit detected`,
    sourceUrl: extractFirstUrl(text),
    eventDate: extractDate(text),
  };
}
