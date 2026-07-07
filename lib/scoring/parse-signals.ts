import {
  FUNDING_DISTRESS_KEYWORDS,
  GLASSDOOR_DECLINE_KEYWORDS,
  GLASSDOOR_RATING_PATTERN,
  HEADCOUNT_PATTERN,
  HEADCOUNT_PCT_PATTERN,
  LAYOFF_KEYWORDS,
  NEGATIVE_PRESS_FINANCIAL_KEYWORDS,
  NEGATIVE_PRESS_KEYWORDS,
  NEGATIVE_PRESS_REGULATORY_KEYWORDS,
  extractSnippet,
} from "./keywords";
import { DetectedSignal, extractDate, extractFirstUrl } from "./signal-types";

export function detectLayoffs(text: string): DetectedSignal | null {
  const lower = text.toLowerCase();
  const matched = LAYOFF_KEYWORDS.some((kw) => lower.includes(kw));
  if (!matched) return null;

  const headcountMatch = text.match(HEADCOUNT_PATTERN);
  const pctMatch = text.match(HEADCOUNT_PCT_PATTERN);

  let points = 35; // small/unspecified layoff
  if (headcountMatch) {
    const headcount = parseInt(headcountMatch[1].replace(/,/g, ""), 10);
    if (headcount >= 500) points = 100;
    else if (headcount >= 100) points = 65;
  } else if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    if (pct >= 20) points = 90;
    else if (pct >= 10) points = 65;
  }

  return {
    points,
    detail: extractSnippet(text, LAYOFF_KEYWORDS),
    sourceUrl: extractFirstUrl(text),
    eventDate: extractDate(text),
  };
}

export function detectNegativePress(text: string): DetectedSignal | null {
  const lower = text.toLowerCase();
  const matched = NEGATIVE_PRESS_KEYWORDS.some((kw) => lower.includes(kw));
  if (!matched) return null;

  let points = 60; // cultural/generic complaints
  if (NEGATIVE_PRESS_FINANCIAL_KEYWORDS.some((kw) => lower.includes(kw))) points = 100;
  else if (NEGATIVE_PRESS_REGULATORY_KEYWORDS.some((kw) => lower.includes(kw))) points = 80;

  return {
    points,
    detail: extractSnippet(text, NEGATIVE_PRESS_KEYWORDS),
    sourceUrl: extractFirstUrl(text),
    eventDate: extractDate(text),
  };
}

export function detectGlassdoorTrend(text: string): DetectedSignal | null {
  const lower = text.toLowerCase();
  const hasDeclineLanguage = GLASSDOOR_DECLINE_KEYWORDS.some((kw) => lower.includes(kw));
  const ratingMatches = [...text.matchAll(new RegExp(GLASSDOOR_RATING_PATTERN, "gi"))];

  if (!hasDeclineLanguage && ratingMatches.length < 2) return null;

  let points = 50; // mild decline language, no clear before/after rating
  if (ratingMatches.length >= 2) {
    const before = parseFloat(ratingMatches[0][1]);
    const after = parseFloat(ratingMatches[1][1]);
    if (!Number.isNaN(before) && !Number.isNaN(after) && after < before) {
      const drop = before - after;
      points = drop >= 0.5 ? 100 : 60;
    } else if (!hasDeclineLanguage) {
      return null;
    }
  }

  return {
    points,
    detail: extractSnippet(text, GLASSDOOR_DECLINE_KEYWORDS) || extractSnippet(text, ["glassdoor"]),
    sourceUrl: extractFirstUrl(text),
    eventDate: extractDate(text),
  };
}

export function detectFundingDistress(text: string): DetectedSignal | null {
  const lower = text.toLowerCase();
  const matched = FUNDING_DISTRESS_KEYWORDS.some((kw) => lower.includes(kw));
  if (!matched) return null;

  let points = 60;
  if (lower.includes("down round") || lower.includes("missed fundraise") || lower.includes("missed raise") || lower.includes("failed to raise")) {
    points = 100;
  } else if (lower.includes("bridge round") || lower.includes("delayed funding")) {
    points = 80;
  }

  return {
    points,
    detail: extractSnippet(text, FUNDING_DISTRESS_KEYWORDS),
    sourceUrl: extractFirstUrl(text),
    eventDate: extractDate(text),
  };
}
