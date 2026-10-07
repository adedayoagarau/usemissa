import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * A person's avatar. Without a photo it shows their initials on a colour
 * chosen from their identity, so the same person keeps the same colour on
 * every list, menu and pane.
 */
const HUES = ["red", "orange", "amber", "yellow", "lime", "green", "teal", "blue", "indigo", "purple", "magenta", "pink"] as const;
export type PersonHue = (typeof HUES)[number];

export function personHue(identity: string): PersonHue {
  let hash = 0;
  for (const character of identity) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return HUES[hash % HUES.length]!;
}

export function personInitials(name: string): string {
  const parts = name.split(/[\s@._-]+/u).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";
}

export function PersonAvatar({ name, identity, src, size = "default", className }: { name: string; identity?: string; src?: string; size?: "sm" | "default" | "lg"; className?: string }) {
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback variant={`hue-${personHue(identity ?? name)}`} aria-hidden="true">
        {personInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
