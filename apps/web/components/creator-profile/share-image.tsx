/* eslint-disable @next/next/no-img-element -- Satori renders plain img elements. */
import { ImageResponse } from "next/og";
import { EMAIL_COLORS as COLOR } from "@/emails/components/base-layout";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";
import { featuredWork } from "@/lib/creator-profile";
import {
  practiceLine,
  profileAddress,
  truncateAtWord,
} from "@/lib/creator-share-kit";
import { shareFamily, shareFontList, type ShareFonts } from "./share/fonts";

/** The name steps down in size so a long one still fits two lines. */
function nameSize(name: string) {
  if (name.length <= 14) return 104;
  if (name.length <= 20) return 88;
  if (name.length <= 28) return 72;
  return 58;
}

/**
 * The 1200×630 card used when a profile link is shared. Drawn from the
 * published profile: portrait and @address, name, what they make, whether
 * they're open to something, and the featured work on the right.
 */
export function creatorShareImage({
  portfolio,
  handleKey,
  photo,
  image,
  fonts = {},
}: {
  portfolio: PortfolioData;
  handleKey: string;
  photo?: string;
  image?: string;
  fonts?: ShareFonts;
}) {
  const name = portfolio.name || `@${handleKey}`;
  const open = portfolio.openTo.find((item) => item.state === "open");
  const line =
    practiceLine(portfolio.selected) ||
    truncateAtWord(portfolio.statement.trim(), 120);
  const title = image
    ? (featuredWork(portfolio.works)?.title ?? "").trim()
    : "";
  const editorial = shareFamily(fonts, "editorial");
  const data = shareFamily(fonts, "data");
  const ui = shareFamily(fonts, "interface");
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLOR.canvas,
        color: COLOR.ink,
        fontFamily: ui,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 64px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {photo && (
            <img
              src={photo}
              alt=""
              width={96}
              height={96}
              style={{ borderRadius: 999, objectFit: "cover" }}
            />
          )}
          <div
            style={{
              display: "flex",
              fontFamily: data,
              fontSize: 24,
              color: COLOR.inkSecondary,
            }}
          >
            @{handleKey}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontFamily: editorial,
              fontSize: nameSize(name),
              lineHeight: 0.95,
              letterSpacing: -3.5,
            }}
          >
            {name}
          </div>
          {line && (
            <div
              style={{
                display: "flex",
                maxWidth: 640,
                fontSize: 30,
                lineHeight: 1.3,
                color: COLOR.inkSecondary,
              }}
            >
              {line}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {open ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 52,
                padding: "0 20px",
                borderRadius: 999,
                background: COLOR.forest50,
                color: COLOR.forest700,
                fontSize: 24,
                fontWeight: 500,
              }}
            >
              Open to {open.label.toLowerCase()}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                fontFamily: data,
                fontSize: 22,
                color: COLOR.inkSecondary,
              }}
            >
              {profileAddress(handleKey)}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontFamily: editorial,
              fontSize: 36,
              color: COLOR.ink,
            }}
          >
            Missa
          </div>
        </div>
      </div>
      {image && (
        <div style={{ display: "flex", position: "relative", width: 472 }}>
          <img
            src={image}
            alt=""
            width={472}
            height={630}
            style={{ objectFit: "cover" }}
          />
          {title && (
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 24,
                right: 24,
                bottom: 24,
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.94)",
                fontFamily: editorial,
                fontSize: 26,
                lineHeight: 1.2,
              }}
            >
              {truncateAtWord(title, 64)}
            </div>
          )}
        </div>
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: shareFontList(fonts),
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    },
  );
}
