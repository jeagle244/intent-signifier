import { Sector, SignalCategory } from "@/lib/types";
import { LocationBucket } from "@/lib/location-mapping";

const SECTORS: { value: Sector | "all"; label: string }[] = [
  { value: "all", label: "All sectors" },
  { value: "fintech", label: "Fintech" },
  { value: "bank", label: "Bank" },
  { value: "payments", label: "Payments" },
  { value: "remittance", label: "Remittance" },
  { value: "bnpl", label: "BNPL" },
  { value: "adjacent-tech", label: "Adjacent tech" },
  { value: "other", label: "Other" },
];

const SIGNALS: { value: SignalCategory | "all"; label: string }[] = [
  { value: "all", label: "All signals" },
  { value: "layoffs", label: "Layoffs" },
  { value: "leadershipExits", label: "Leadership exits" },
  { value: "negativePress", label: "Negative press" },
  { value: "glassdoorTrend", label: "Glassdoor trend" },
  { value: "fundingDistress", label: "Funding distress" },
];

const TIERS: { value: string; label: string }[] = [
  { value: "all", label: "All tiers" },
  { value: "A — Priority", label: "Tier A — Priority" },
  { value: "B — Strong", label: "Tier B — Strong" },
  { value: "C — Watch", label: "Tier C — Watch" },
  { value: "D — Low", label: "Tier D — Low" },
];

const LOCATIONS: { value: LocationBucket | "all"; label: string }[] = [
  { value: "all", label: "All locations" },
  { value: "UK", label: "UK" },
  { value: "US", label: "US" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Europe", label: "Europe (other)" },
  { value: "Other", label: "Other" },
];

export interface FilterState {
  search: string;
  sector: Sector | "all";
  signal: SignalCategory | "all";
  tier: string;
  location: LocationBucket | "all";
  minScore: number;
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center mb-5">
      <input
        type="search"
        placeholder="Search companies…"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="hard-border rounded-lg px-3 py-2 text-sm bg-white flex-1 min-w-[180px]"
      />

      <select
        value={filters.sector}
        onChange={(e) => onChange({ ...filters, sector: e.target.value as FilterState["sector"] })}
        className="hard-border rounded-lg px-3 py-2 text-sm bg-white"
      >
        {SECTORS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={filters.tier}
        onChange={(e) => onChange({ ...filters, tier: e.target.value })}
        className="hard-border rounded-lg px-3 py-2 text-sm bg-white"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        value={filters.location}
        onChange={(e) => onChange({ ...filters, location: e.target.value as FilterState["location"] })}
        className="hard-border rounded-lg px-3 py-2 text-sm bg-white"
      >
        {LOCATIONS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>

      <select
        value={filters.signal}
        onChange={(e) => onChange({ ...filters, signal: e.target.value as FilterState["signal"] })}
        className="hard-border rounded-lg px-3 py-2 text-sm bg-white"
      >
        {SIGNALS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm hard-border rounded-lg px-3 py-2 bg-white">
        Min score
        <input
          type="number"
          min={0}
          max={100}
          value={filters.minScore}
          onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) || 0 })}
          className="w-14 outline-none"
        />
      </label>
    </div>
  );
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  sector: "all",
  signal: "all",
  tier: "all",
  location: "all",
  minScore: 0,
};
