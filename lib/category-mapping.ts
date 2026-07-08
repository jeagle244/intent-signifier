import { Sector } from "@/lib/types";

/**
 * Maps the CSV's richer 13-value Category taxonomy down onto the app's
 * existing 7-value Sector enum (kept for the filter dropdown per the plan
 * doc's decision). Klarna/Zilch-style BNPL companies land under "Consumer
 * Credit" in this taxonomy, not a dedicated BNPL bucket — mapped to
 * "fintech" here, the accepted tradeoff of keeping the existing enum.
 */
export const CATEGORY_TO_SECTOR: Record<string, Sector> = {
  "Neobanks": "bank",
  "Consumer Credit": "fintech",
  "Savings / Investments / Wealth": "fintech",
  "Payment Infrastructure": "payments",
  "Card Payment Processors": "payments",
  "Insurtech": "fintech",
  "Banking Infrastructure": "adjacent-tech",
  "Business Lending": "fintech",
  "Expensing / Payroll Payments": "payments",
  "Open Banking": "adjacent-tech",
  "Superapps": "other",
  "Credit Cards": "fintech",
  "Remittance Payments": "remittance",
};

export function categoryToSector(category: string): Sector {
  return CATEGORY_TO_SECTOR[category] ?? "other";
}
