import { Badge } from "@/components/ui/badge";

export function CountBadge({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <Badge variant="secondary" size="compact" aria-label={`${count} ${label}`}>
      {count}
    </Badge>
  );
}
