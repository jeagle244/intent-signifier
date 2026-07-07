import { getAllCompanies, getDemoGeneratedAt } from "@/lib/demo-data";
import { LeagueTable } from "@/components/league-table/LeagueTable";
import { Logo } from "@/components/ui/Logo";

export default function HomePage() {
  const companies = getAllCompanies();
  const generatedAt = getDemoGeneratedAt();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-[1.5px] border-ink px-6 py-4 flex items-center justify-between">
        <Logo />
        <span className="hard-border rounded-full px-3 py-1 text-xs font-medium bg-white">
          Last refreshed {new Date(generatedAt).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <p className="eyebrow mb-2">LemFi Candidate Intent</p>
        <h1 className="text-4xl font-bold mb-3">
          Who to <span className="highlight-mark">source this week</span>
        </h1>
        <p className="text-ink/60 max-w-2xl mb-8">
          Ranked by Move Likelihood Score — public signals on layoffs, leadership churn, negative
          press, Glassdoor sentiment, and funding distress across our target companies.
        </p>

        <LeagueTable companies={companies} />
      </main>
    </div>
  );
}
