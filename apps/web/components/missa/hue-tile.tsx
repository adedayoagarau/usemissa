import { personHue, type PersonHue } from "@/components/missa/person-avatar";

/**
 * A small colour tile that marks a record, the way task tools mark a
 * project: an icon or a number on one of the categorical hues, chosen from
 * the record's identity so it stays the same everywhere. A fixed place, such
 * as a navigation destination, names its hue instead so it never collides.
 */
const solidHue: Record<PersonHue, string> = {
  red: "bg-hue-red", orange: "bg-hue-orange", amber: "bg-hue-amber", yellow: "bg-hue-yellow",
  lime: "bg-hue-lime", green: "bg-hue-green", teal: "bg-hue-teal", blue: "bg-hue-blue",
  indigo: "bg-hue-indigo", purple: "bg-hue-purple", magenta: "bg-hue-magenta", pink: "bg-hue-pink",
};

/** The quieter tone: a tinted tile with the icon in the hue's ink. */
const softHue: Record<PersonHue, string> = {
  red: "bg-hue-red-subtle text-hue-red-ink", orange: "bg-hue-orange-subtle text-hue-orange-ink",
  amber: "bg-hue-amber-subtle text-hue-amber-ink", yellow: "bg-hue-yellow-subtle text-hue-yellow-ink",
  lime: "bg-hue-lime-subtle text-hue-lime-ink", green: "bg-hue-green-subtle text-hue-green-ink",
  teal: "bg-hue-teal-subtle text-hue-teal-ink", blue: "bg-hue-blue-subtle text-hue-blue-ink",
  indigo: "bg-hue-indigo-subtle text-hue-indigo-ink", purple: "bg-hue-purple-subtle text-hue-purple-ink",
  magenta: "bg-hue-magenta-subtle text-hue-magenta-ink", pink: "bg-hue-pink-subtle text-hue-pink-ink",
};

export function HueTile({ identity, hue, tone = "solid", children, size = "default" }: { identity?: string; hue?: PersonHue; tone?: "solid" | "soft"; children: React.ReactNode; size?: "sm" | "default" }) {
  const name = hue ?? personHue(identity ?? "");
  const colour = tone === "soft" ? softHue[name] : `${solidHue[name]} text-foreground`;
  return (
    <span aria-hidden="true" data-slot="hue-tile" className={`flex shrink-0 items-center justify-center rounded-md font-semibold [&_svg]:size-4 ${colour} ${size === "sm" ? "size-6 text-xs" : "size-8 text-sm"}`}>
      {children}
    </span>
  );
}
