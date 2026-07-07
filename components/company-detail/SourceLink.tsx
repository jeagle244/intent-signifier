export function SourceLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-xs text-ink/40">No source captured</span>;

  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // leave as-is if not a valid URL
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium text-purple hover:underline"
    >
      Source: {host} ↗
    </a>
  );
}
