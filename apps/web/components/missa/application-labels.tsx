import { Badge } from "@/components/ui/badge";

/** At most two labels: opportunity type and a relevant personal/availability state. */
export function ApplicationLabels({ kind, status }: { kind: string; status?: string }) {
  return <span className="mb-2 flex flex-wrap gap-2"><Badge variant="outline">{kind}</Badge>{status ? <Badge variant="secondary">{status}</Badge> : null}</span>;
}
