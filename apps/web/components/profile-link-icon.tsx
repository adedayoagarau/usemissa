import type { ProfileSocialService } from "@missa/radar-engine";
import { Globe2, Link2 } from "lucide-react";
import type { IconType } from "react-icons";
import {
  FaBandcamp,
  FaBehance,
  FaBluesky,
  FaInstagram,
  FaLinkedinIn,
  FaMastodon,
  FaMedium,
  FaSoundcloud,
  FaTiktok,
  FaVimeoV,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { SiSubstack } from "react-icons/si";

const SERVICE_ICONS: Partial<Record<ProfileSocialService, IconType>> = {
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  bluesky: FaBluesky,
  x: FaXTwitter,
  mastodon: FaMastodon,
  substack: SiSubstack,
  medium: FaMedium,
  behance: FaBehance,
  vimeo: FaVimeoV,
  soundcloud: FaSoundcloud,
  bandcamp: FaBandcamp,
};

export function ProfileLinkIcon({
  service,
  className,
}: {
  service: ProfileSocialService;
  className?: string;
}) {
  if (service === "website") {
    return <Globe2 className={className} aria-hidden="true" />;
  }
  if (service === "other") {
    return <Link2 className={className} aria-hidden="true" />;
  }

  const ServiceIcon = SERVICE_ICONS[service];
  return ServiceIcon ? (
    <ServiceIcon className={className} aria-hidden="true" />
  ) : (
    <Link2 className={className} aria-hidden="true" />
  );
}
