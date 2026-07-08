import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";
import { ACTIVE_SCAN_TIERS, computeRelevanceScore } from "@/lib/relevance";
import { categoryToSector } from "@/lib/category-mapping";
import { Sector } from "@/lib/types";

export interface SeedCompany {
  name: string;
  sector: Sector;
  category: string;
  tier: string;
  activeScan: boolean;
  relevanceScore: number;
  mainLocation: string | null;
  status: string | null;
  fundingStage: string | null;
  valuationBand: string | null;
  valuationNotes: string | null;
  dataConfidence: string | null;
  categoryFit: number;
  marketOverlap: number;
  productAdjacency: number;
  talentPoachability: number;
  growthHeat: number;
  competitiveNotes: string | null;
}

interface CsvRow {
  Company: string;
  "LemFi Relevance Score": string;
  Tier: string;
  Category: string;
  "Main Employee Location": string;
  Status: string;
  "Last Funding Stage": string;
  "Valuation Band": string;
  "Est. Valuation / ARR (notes)": string;
  "Data Confidence": string;
  "Category Fit": string;
  "Market Overlap": string;
  "Product Adjacency": string;
  "Talent / Stage Poachability": string;
  "Growth / Heat": string;
  "Flags / Competitive Notes": string;
}

function orNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function loadSeedCompanies(): SeedCompany[] {
  const csvPath = join(process.cwd(), "data", "target-companies.csv");
  const csvContent = readFileSync(csvPath, "utf8");
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true }) as CsvRow[];

  return rows.map((row) => {
    const categoryFit = Number(row["Category Fit"]);
    const marketOverlap = Number(row["Market Overlap"]);
    const productAdjacency = Number(row["Product Adjacency"]);
    const talentPoachability = Number(row["Talent / Stage Poachability"]);
    const growthHeat = Number(row["Growth / Heat"]);

    return {
      name: row.Company.trim(),
      sector: categoryToSector(row.Category.trim()),
      category: row.Category.trim(),
      tier: row.Tier.trim(),
      activeScan: ACTIVE_SCAN_TIERS.includes(row.Tier.trim()),
      relevanceScore: computeRelevanceScore({
        categoryFit,
        marketOverlap,
        productAdjacency,
        talentPoachability,
        growthHeat,
      }),
      mainLocation: orNull(row["Main Employee Location"]),
      status: orNull(row.Status),
      fundingStage: orNull(row["Last Funding Stage"]),
      valuationBand: orNull(row["Valuation Band"]),
      valuationNotes: orNull(row["Est. Valuation / ARR (notes)"]),
      dataConfidence: orNull(row["Data Confidence"]),
      categoryFit,
      marketOverlap,
      productAdjacency,
      talentPoachability,
      growthHeat,
      competitiveNotes: orNull(row["Flags / Competitive Notes"]),
    };
  });
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
