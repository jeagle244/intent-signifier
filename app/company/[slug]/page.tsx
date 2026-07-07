import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyBySlug } from "@/lib/demo-data";
import { Logo } from "@/components/ui/Logo";
import { ScoreBadge } from "@/components/league-table/ScoreBadge";
import { TrendArrow } from "@/components/league-table/TrendArrow";
import { SubScoreBreakdown } from "@/components/company-detail/SubScoreBreakdown";
import { EventTimeline } from "@/components/company-detail/EventTimeline";
import { SourcingAngleCard } from "@/components/company-detail/SourcingAngleCard";

const SECTOR_LABEL: Record<string, string> = {
  fintech: "Fintech",
  bank: "Bank",
  payments: "Payments",
  remittance: "Remittance",
  bnpl: "BNPL",
  "adjacent-tech": "Adjacent tech",
  other: "Other",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-[1.5px] border-ink px-6 py-4">
        <Logo />
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <Link href="/" className="text-sm text-purple font-medium hover:underline">
          ← Back to league table
        </Link>

        <div className="flex items-start justify-between mt-4 mb-2">
          <div>
            <p className="eyebrow mb-1">{SECTOR_LABEL[company.sector] ?? company.sector}</p>
            <h1 className="text-4xl font-bold">{company.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <TrendArrow trend={company.trend} />
            <ScoreBadge score={company.compositeScore} size="md" />
          </div>
        </div>

        {company.whySummary && <p className="text-ink/60 mb-1">{company.whySummary}</p>}
        {company.lastScannedAt && (
          <p className="text-xs text-ink/40 mb-8">
            Last refreshed{" "}
            {new Date(company.lastScannedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        <div className="flex flex-col gap-5">
          <SourcingAngleCard angle={company.sourcingAngle} />
          <SubScoreBreakdown subScores={company.subScores} />
          <EventTimeline events={company.events} />
        </div>
      </main>
    </div>
  );
}
