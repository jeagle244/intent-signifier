import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";

export function SourcingAngleCard({ angle }: { angle: string | null }) {
  return (
    <Card className="p-5 bg-lime/30">
      <div className="flex items-start gap-3">
        <Mascot pose="wave" size={56} className="shrink-0" />
        <div>
          <h2 className="font-bold text-lg mb-1">Sourcing angle</h2>
          {angle ? (
            <p className="text-sm">{angle}</p>
          ) : (
            <p className="text-sm text-ink/50">
              Not enough signal yet to suggest an outreach angle for this company.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
