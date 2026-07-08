import { ALERT_CONFIG } from "@/lib/scoring/weights";

export interface AlertCandidate {
  slug: string;
  name: string;
  sector: string;
  compositeScore: number | null;
  previousScore: number | null;
  rank: number;
  priorRank: number | null;
  whySummary: string | null;
}

function isNewTopN(c: AlertCandidate): boolean {
  // Rank alone isn't meaningful for a company with no detected signal —
  // null-score companies are arbitrarily ordered relative to each other,
  // so without this check one could "enter the top 10" on pure tie-break
  // noise between runs.
  return (
    c.compositeScore !== null &&
    c.rank <= ALERT_CONFIG.topNThreshold &&
    (c.priorRank === null || c.priorRank > ALERT_CONFIG.topNThreshold)
  );
}

function isScoreJump(c: AlertCandidate): boolean {
  return (
    c.compositeScore !== null &&
    c.previousScore !== null &&
    c.compositeScore - c.previousScore >= ALERT_CONFIG.scoreJumpThreshold
  );
}

/**
 * Ported from the lemfi-competitor-intel bot's postSlackDigest() Block Kit
 * pattern, fires once per scan run rather than per-company real-time.
 */
export async function postThresholdAlerts(
  candidates: AlertCandidate[],
  generatedAt: string,
  baseUrl?: string
): Promise<{ skipped: boolean; count?: number }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Slack] No SLACK_WEBHOOK_URL configured. Skipping.");
    return { skipped: true };
  }

  const movers = candidates.filter((c) => isNewTopN(c) || isScoreJump(c));
  if (movers.length === 0) {
    console.log("[Slack] No threshold crossings this run. Skipping digest.");
    return { skipped: true };
  }

  const dateStr = new Date(generatedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const blocks = [
    { type: "header", text: { type: "plain_text", text: "LemFi Candidate Intent Alert", emoji: true } },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${dateStr}* — ${movers.length} company movement${movers.length > 1 ? "s" : ""} to review.`,
      },
    },
    { type: "divider" },
    ...movers.map((c) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${c.rank}. ${c.name}* (${c.sector}) — Move Likelihood: *${c.compositeScore ?? "n/a"}/100*\n` +
          `${c.whySummary ?? ""}` +
          (baseUrl ? `\n<${baseUrl}/company/${c.slug}|View sourcing angle & sources →>` : ""),
      },
    })),
  ];

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${body}`);
  }

  console.log(`[Slack] Alert posted. ${movers.length} companies included.`);
  return { skipped: false, count: movers.length };
}
