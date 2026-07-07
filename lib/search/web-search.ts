import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Same pattern as the lemfi-competitor-intel bot's searchWeb(): a single
 * Claude call with the web_search tool, asked to summarize with dates,
 * headcounts, and direct quotes from a fixed set of reputable sources.
 */
export async function searchWeb(query: string): Promise<string> {
  try {
    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
      messages: [
        {
          role: "user",
          content: `Search for: ${query}. Return a brief summary of what you find including any dates, headcount numbers, and direct quotes from articles. Focus on TechCrunch, Bloomberg, Reuters, FT, and LinkedIn.`,
        },
      ],
    });

    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join(" ");
  } catch (err) {
    console.error("Web search error:", err instanceof Error ? err.message : err);
    return "";
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
