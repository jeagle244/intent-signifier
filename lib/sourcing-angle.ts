import Anthropic from "@anthropic-ai/sdk";
import { SignalCategory } from "@/lib/types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const CATEGORY_LABEL: Record<SignalCategory, string> = {
  layoffs: "layoffs",
  leadershipExits: "a leadership exit",
  negativePress: "negative press",
  glassdoorTrend: "declining Glassdoor sentiment",
  fundingDistress: "funding distress",
};

function fallbackAngle(companyName: string, category: SignalCategory): string {
  return `${companyName} is showing signs of ${CATEGORY_LABEL[category]} — worth checking in with people there while it's fresh.`;
}

/**
 * Ported from the lemfi-competitor-intel bot's generateOutreachAngle(),
 * reframed from a copy-paste InMail line to an internal recruiter note:
 * this tool's "sourcing angle" is what a recruiter reads before deciding
 * where to spend a week's sourcing effort, not something sent verbatim.
 *
 * Tier/category context lets the note reason about both dimensions the
 * league table ranks on (e.g. "Tier A priority target AND showing
 * layoffs" is a stronger signal than the layoff alone).
 */
export async function generateSourcingAngle(
  companyName: string,
  primaryCategory: SignalCategory,
  primaryDetail: string,
  relevanceContext: { tier: string; category: string }
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackAngle(companyName, primaryCategory);
  }

  const prompt = `You are briefing an internal recruiter at LemFi (cross-border fintech, diaspora-focused, operating in 20+ countries) on why now might be a good moment to source candidates from ${companyName}.

Company relevance: ${relevanceContext.tier} target, category: ${relevanceContext.category}
Signal detected: ${CATEGORY_LABEL[primaryCategory]}
Evidence: ${primaryDetail}

Write a 1-2 sentence internal note suggesting what a recruiter could reference in outreach given this signal (e.g. team morale, scope changes, stability concerns). Where relevant, briefly note why this company is strategically worth prioritizing given its relevance tier, not just the immediate signal. This is for internal use, not a message sent to a candidate — do not write it as an InMail. Be specific and grounded in the evidence, not generic. Output only the note, no preamble.`;

  try {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    return textBlock ? textBlock.text.trim().replace(/^["']|["']$/g, "") : fallbackAngle(companyName, primaryCategory);
  } catch (err) {
    console.error(`Sourcing angle generation error for ${companyName}:`, err instanceof Error ? err.message : err);
    return fallbackAngle(companyName, primaryCategory);
  }
}
