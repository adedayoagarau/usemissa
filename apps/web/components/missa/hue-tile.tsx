import { personHue } from "@/components/missa/person-avatar";

/**
 * A small colour tile that marks a record, the way task tools mark a
 * project: an icon or a number on one of the categorical hues, chosen from
 * the record's identity so it stays the same everywhere.
 */
const tileHue: Record<string, string> = {
  red: "bg-hue-red", orange: "bg-hue-orange", amber: "bg-hue-amber", yellow: "bg-hue-yellow",
  lime: "bg-hue-lime", green: "bg-hue-green", teal: "bg-hue-teal", blue: "bg-hue-blue",
  indigo: "bg-hue-indigo", purple: "bg-hue-purple", magenta: "bg-hue-magenta", pink: "bg-hue-pink",
};

export function HueTile({ identity, children, size = "default" }: { identity: string; children: React.ReactNode; size?: "sm" | "default" }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-md font-semibold text-foreground [&_svg]:size-4 ${tileHue[personHue(identity)]} ${size === "sm" ? "size-6 text-xs" : "size-8 text-sm"}`}>
      {children}
    </span>
  );
}
