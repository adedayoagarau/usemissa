import { Globe, AtSign, Play } from "lucide-react";
import Instagram from "@/assets/svg/instagram-icon";
import Facebook from "@/assets/svg/facebook-icon";
const Linkedin = () => <span aria-hidden="true" className="font-bold">in</span>;
const Youtube = Play;
import { Button } from "./ui/button";

const platforms = [
  { hosts: ["instagram.com"], label: "Instagram", icon: Instagram },
  { hosts: ["facebook.com", "fb.com"], label: "Facebook", icon: Facebook },
  { hosts: ["linkedin.com"], label: "LinkedIn", icon: Linkedin },
  { hosts: ["youtube.com", "youtu.be"], label: "YouTube", icon: Youtube },
  { hosts: ["twitter.com", "x.com"], label: "X", icon: null },
  { hosts: ["threads.net", "threads.com"], label: "Threads", icon: AtSign },
];

export function InstitutionSocialLinks({
  links,
  name,
}: {
  links: Record<string, string | null>;
  name: string;
}) {
  const seen = new Set<string>();
  const items = Object.entries(links).flatMap(([key, value]) => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href))
        return [];
      seen.add(url.href);
      const host = url.hostname.toLowerCase();
      const platform = platforms.find((p) =>
        p.hosts.some((h) => host === h || host.endsWith(`.${h}`)),
      );
      return [
        {
          href: url.href,
          label: platform?.label || key.replace(/[_-]/g, " "),
          icon: platform ? platform.icon : Globe,
        },
      ];
    } catch {
      return [];
    }
  });
  if (!items.length) return null;
  return (
    <nav
      aria-label={`${name} social media`}
      className="mt-1 flex flex-wrap gap-1"
    >
      {items.map(({ href, label, icon: Icon }) => (
        <Button
          key={href}
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          nativeButton={false}
          render={
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} on ${label} (opens in new tab)`}
              title={label}
            />
          }
        >
          {Icon ? (
            <Icon width={18} height={18} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">𝕏</span>
          )}
        </Button>
      ))}
    </nav>
  );
}
