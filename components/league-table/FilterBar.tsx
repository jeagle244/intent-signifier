import { Sector, SignalCategory } from "@/lib/types";

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

export interface FilterState {
  search: string;
  sector: Sector | "all";
  signal: SignalCategory | "all";
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
  minScore: 0,
};
