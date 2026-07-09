export const LOCATION_BUCKETS = ["UK", "US", "Nigeria", "Europe", "Other"] as const;
export type LocationBucket = (typeof LOCATION_BUCKETS)[number];

// Countries observed in the CSV's "Main Employee Location" column that
// should fall under the "Europe" bucket (everything else European; UK gets
// its own dedicated bucket rather than folding into this one).
const EUROPE_COUNTRIES = [
  "france", "germany", "latvia", "spain", "italy", "norway", "ireland",
  "lithuania", "sweden", "portugal", "estonia", "netherlands", "denmark",
  "belgium", "poland", "austria", "switzerland", "finland", "greece",
  "czech republic", "romania", "hungary", "iceland", "luxembourg", "malta",
  "cyprus", "slovakia", "slovenia", "croatia", "bulgaria",
];

/**
 * Location is free text and sometimes multi-value (e.g. "Nigeria, UK") —
 * matches if ANY of the company's listed locations falls in the bucket,
 * since a recruiter filtering by "UK" wants companies with UK-based talent
 * even if they're also present elsewhere.
 */
export function matchesLocationBucket(mainLocation: string | null, bucket: LocationBucket): boolean {
  if (!mainLocation) return bucket === "Other";
  const parts = mainLocation.split(",").map((p) => p.trim().toLowerCase());

  switch (bucket) {
    case "UK":
      return parts.includes("uk");
    case "US":
      return parts.includes("usa") || parts.includes("us");
    case "Nigeria":
      return parts.includes("nigeria");
    case "Europe":
      return parts.some((p) => EUROPE_COUNTRIES.includes(p));
    case "Other":
      return !parts.some(
        (p) => p === "uk" || p === "usa" || p === "us" || p === "nigeria" || EUROPE_COUNTRIES.includes(p)
      );
  }
}
