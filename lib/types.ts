export type Sector =
  | "fintech"
  | "bank"
  | "payments"
  | "remittance"
  | "bnpl"
  | "adjacent-tech"
  | "other";

export type SignalCategory =
  | "layoffs"
  | "leadershipExits"
  | "negativePress"
  | "glassdoorTrend"
  | "fundingDistress";

export type EventType =
  | "layoff"
  | "leadership_exit"
  | "negative_press"
  | "glassdoor"
  | "funding_distress";

export type Trend = "up" | "down" | "flat" | "new";

export interface SubScores {
  layoffs: number | null;
  leadershipExits: number | null;
  negativePress: number | null;
  glassdoorTrend: number | null;
  fundingDistress: number | null;
}

export interface CompanyEvent {
  id: number;
  eventType: EventType;
  eventDate: string | null;
  description: string;
  sourceUrl: string | null;
  pointsContributed: number | null;
}

export interface CompanySummary {
  slug: string;
  name: string;
  sector: Sector;
  compositeScore: number | null;
  previousScore: number | null;
  trend: Trend;
  whySummary: string | null;
  subScores: SubScores;
  lastScannedAt: string | null;
}

export interface CompanyDetail extends CompanySummary {
  sourcingAngle: string | null;
  events: CompanyEvent[];
}
