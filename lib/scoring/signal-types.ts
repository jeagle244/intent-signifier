export interface DetectedSignal {
  /** 0-100 raw sub-score for this category, before weighting. */
  points: number;
  detail: string;
  sourceUrl: string | null;
  /** ISO yyyy-mm-dd if a date could be extracted, else null. */
  eventDate: string | null;
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s"')]+/);
  return match ? match[0].replace(/[.,]+$/, "") : null;
}

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_PATTERN = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i");

export function extractDate(text: string): string | null {
  const match = text.match(DATE_PATTERN);
  if (!match) return null;
  const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
