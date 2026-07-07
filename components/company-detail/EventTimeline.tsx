import { CompanyEvent } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { SourceLink } from "./SourceLink";

const TYPE_LABEL: Record<CompanyEvent["eventType"], string> = {
  layoff: "Layoff",
  leadership_exit: "Leadership exit",
  negative_press: "Negative press",
  glassdoor: "Glassdoor",
  funding_distress: "Funding distress",
};

export function EventTimeline({ events }: { events: CompanyEvent[] }) {
  const sorted = [...events].sort((a, b) => {
    if (!a.eventDate) return 1;
    if (!b.eventDate) return -1;
    return b.eventDate.localeCompare(a.eventDate);
  });

  return (
    <Card className="p-5">
      <h2 className="font-bold text-lg mb-4">Timeline</h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-ink/50">No events detected in the latest scan.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {sorted.map((event) => (
            <li key={event.id} className="border-l-[3px] border-lime pl-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide text-purple">
                  {TYPE_LABEL[event.eventType]}
                </span>
                {event.eventDate && (
                  <span className="text-xs text-ink/40">
                    {new Date(event.eventDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm mb-1">{event.description}</p>
              <SourceLink url={event.sourceUrl} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
