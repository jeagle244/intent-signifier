import { SignalCategory } from "@/lib/types";

const CURRENT_YEAR = new Date().getUTCFullYear();

export function buildSearchQueries(companyName: string): Record<SignalCategory, string> {
  return {
    layoffs: `"${companyName}" layoffs ${CURRENT_YEAR} employees workforce`,
    leadershipExits: `"${companyName}" CEO OR CTO OR CFO OR "chief" steps down departs resigns ${CURRENT_YEAR}`,
    negativePress: `"${companyName}" funding trouble OR regulatory OR scandal OR lawsuit ${CURRENT_YEAR}`,
    glassdoorTrend: `"${companyName}" glassdoor rating reviews employees declining`,
    fundingDistress: `"${companyName}" down round OR hiring freeze OR missed raise funding ${CURRENT_YEAR}`,
  };
}
