"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CompanySummary } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { TrendArrow } from "./TrendArrow";
import { DEFAULT_FILTERS, FilterBar, FilterState } from "./FilterBar";

type SortKey = "rank" | "name" | "score" | "sector";
type SortDir = "asc" | "desc";

const SECTOR_LABEL: Record<string, string> = {
  fintech: "Fintech",
  bank: "Bank",
  payments: "Payments",
  remittance: "Remittance",
  bnpl: "BNPL",
  "adjacent-tech": "Adjacent tech",
  other: "Other",
};

export function LeagueTable({ companies }: { companies: CompanySummary[] }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.sector !== "all" && c.sector !== filters.sector) return false;
      if (filters.signal !== "all" && c.subScores[filters.signal] == null) return false;
      if (filters.minScore > 0 && (c.compositeScore ?? -1) < filters.minScore) return false;
      return true;
    });
  }, [companies, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "sector") cmp = a.sector.localeCompare(b.sector);
      else cmp = (a.compositeScore ?? -1) - (b.compositeScore ?? -1);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="hard-border hard-shadow rounded-2xl bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-[1.5px] border-ink bg-cream/60">
              <th className="px-4 py-3 font-bold w-12">#</th>
              <th
                className="px-4 py-3 font-bold cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                Company
              </th>
              <th
                className="px-4 py-3 font-bold cursor-pointer select-none"
                onClick={() => toggleSort("score")}
              >
                Score {sortKey === "score" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th className="px-4 py-3 font-bold">7-day trend</th>
              <th className="px-4 py-3 font-bold">Why</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr
                key={c.slug}
                className="border-b border-ink/10 last:border-0 hover:bg-lime/20 transition-colors"
              >
                <td className="px-4 py-3 font-bold text-ink/50">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/company/${c.slug}`} className="font-bold hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-xs text-ink/50">{SECTOR_LABEL[c.sector] ?? c.sector}</div>
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={c.compositeScore} />
                </td>
                <td className="px-4 py-3">
                  <TrendArrow trend={c.trend} />
                </td>
                <td className="px-4 py-3 text-ink/70 max-w-md">{c.whySummary}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
                  No companies match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
