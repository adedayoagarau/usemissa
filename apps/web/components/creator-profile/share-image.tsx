/* eslint-disable @next/next/no-img-element -- Satori renders plain img elements. */
import { ImageResponse } from "next/og";
import { EMAIL_COLORS as COLOR } from "@/emails/components/base-layout";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";

let editorialFont: Promise<ArrayBuffer | undefined> | undefined;

/** Newsreader as TTF; the share image falls back to the default face offline. */
export function loadEditorialFont() {
  editorialFont ??= (async () => {
    try {
      const css = await fetch(
        "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@72,400",
      ).then((res) => res.text());
      const url = css.match(
        /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
      )?.[1];
      return url
        ? await fetch(url).then((res) => res.arrayBuffer())
        : undefined;
    } catch {
      return undefined;
    }
  })();
  return editorialFont;
}

/** The 1200×630 card used when a profile link is shared. */
export function creatorShareImage({
  portfolio,
  handleKey,
  photo,
  image,
  font,
}: {
  portfolio: PortfolioData;
  handleKey: string;
  photo?: string;
  image?: string;
  font?: ArrayBuffer;
}) {
  const resolved = { handleKey };
  const name = portfolio.name || `@${resolved.handleKey}`;
  const open = portfolio.openTo.find((item) => item.state === "open");
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLOR.canvas,
        color: COLOR.ink,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 64px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {photo && (
            <img
              src={photo}
              alt=""
              width={84}
              height={84}
              style={{ borderRadius: 999, objectFit: "cover" }}
            />
          )}
          <div
            style={{ display: "flex", fontSize: 24, color: COLOR.inkSecondary }}
          >
            @{resolved.handleKey}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontFamily: font ? "Newsreader" : undefined,
              fontSize: name.length > 18 ? 76 : 96,
              lineHeight: 0.95,
              letterSpacing: -3,
            }}
          >
            {name}
          </div>
          {(portfolio.statement || portfolio.selected.length > 0) && (
            <div
              style={{
                display: "flex",
                maxWidth: 640,
                fontSize: 28,
                lineHeight: 1.3,
                color: COLOR.inkSecondary,
              }}
            >
              {(portfolio.statement || portfolio.selected.join(", ")).slice(
                0,
                120,
              )}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: COLOR.inkSecondary,
          }}
        >
          {open ? (
            <div
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 999,
                background: COLOR.forest50,
                color: COLOR.forest700,
              }}
            >
              Open to {open.label.toLowerCase()}
            </div>
          ) : (
            <div style={{ display: "flex" }}>
              usemissa.com/@{resolved.handleKey}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontFamily: font ? "Newsreader" : undefined,
              fontSize: 30,
              color: COLOR.ink,
            }}
          >
            Missa
          </div>
        </div>
      </div>
      {image && (
        <img
          src={image}
          alt=""
          width={420}
          height={630}
          style={{ objectFit: "cover" }}
        />
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: font
        ? [{ name: "Newsreader", data: font, weight: 400 }]
        : undefined,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    },
  );
}
