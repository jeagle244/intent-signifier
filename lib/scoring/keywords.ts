export const LAYOFF_KEYWORDS = [
  "layoff", "laid off", "lay off", "redundan", "retrench", "workforce reduction",
  "job cut", "headcount reduction", "downsizing", "letting go", "eliminated position",
];

export const LEADERSHIP_EXIT_KEYWORDS = [
  "steps down", "resigns", "resignation", "departs", "departure", "stepping down",
  "leaves the company", "exits as", "to leave", "no longer serves as", "ousted",
];

export const LEADERSHIP_TITLE_PATTERN =
  /\b(CEO|CTO|CFO|COO|CPO|CMO|Chief\s+\w+\s+Officer|VP|Vice\s+President|SVP|EVP)\b/i;

export const NEGATIVE_PRESS_KEYWORDS = [
  "financial trouble", "funding crisis", "missed revenue", "missed targets",
  "regulatory action", "SEC investigation", "lawsuit", "insolvency", "bankruptcy",
  "scandal", "fined", "penalty", "investigation", "struggling", "crisis",
];

export const NEGATIVE_PRESS_FINANCIAL_KEYWORDS = [
  "financial trouble", "funding crisis", "insolvency", "bankruptcy", "struggling", "crisis",
];

export const NEGATIVE_PRESS_REGULATORY_KEYWORDS = [
  "regulatory action", "sec investigation", "fined", "penalty", "investigation", "lawsuit",
];

export const GLASSDOOR_DECLINE_KEYWORDS = [
  "glassdoor rating drop", "rating dropped", "declining reviews", "reviews declining",
  "glassdoor score fell", "employee satisfaction dropped", "morale declining",
];

export const GLASSDOOR_RATING_PATTERN = /(\d(?:\.\d)?)\s*(?:star|\/5|out of 5)/i;

export const FUNDING_DISTRESS_KEYWORDS = [
  "down round", "missed fundraise", "missed raise", "bridge round", "hiring freeze",
  "burn rate", "runway concerns", "valuation cut", "delayed funding", "failed to raise",
];

export const HEADCOUNT_PATTERN = /(\d[\d,]+)\s*(employees?|workers?|engineers?|staff|people|jobs?)/i;
export const HEADCOUNT_PCT_PATTERN = /(\d+)%\s*(of\s*)?(its\s*)?(workforce|staff|employees?|team)/i;

export function extractSnippet(text: string, keywords: string[], windowSize = 90): string {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(text.length, idx + kw.length + windowSize);
      return text.slice(start, end).replace(/\s+/g, " ").trim();
    }
  }
  return "";
}
