/* eslint-disable @next/next/no-img-element -- Satori renders plain img elements. */
import { ImageResponse } from "next/og";
import { EMAIL_COLORS as COLOR } from "@/emails/components/base-layout";
import type { PortfolioData } from "@/lib/creator-portfolio-schema";
import {
  profileAddress,
  storyBody,
  type StoryExcerpt,
} from "@/lib/creator-share-kit";
import { shareFamily, shareFontList, type ShareFonts } from "./fonts";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
/** The picture takes the top 62.5% of the frame; the words sit below it. */
const PICTURE_HEIGHT = 1200;

/** The name steps down so a long one wraps to two lines at most. */
function nameSize(name: string) {
  if (name.length <= 16) return 88;
  if (name.length <= 24) return 72;
  if (name.length <= 32) return 56;
  return 44;
}

/**
 * Type size for the words: large for a few, smaller for more. A poem's lines
 * are never broken, so its longest line sets a ceiling; prose just wraps.
 */
function quoteSize(lines: string[], withPicture: boolean) {
  const column = STORY_WIDTH - (withPicture ? 160 : 176);
  const length = lines.join(" ").length;
  const [large, medium, small] = withPicture ? [68, 60, 52] : [120, 96, 76];
  const byLength = length <= 60 ? large : length <= 100 ? medium : small;
  if (lines.length < 2) return byLength;
  const longest = Math.max(...lines.map((line) => line.length));
  // Newsreader italic runs about 0.41em a character; leave a little room.
  const fits = Math.floor(column / (longest * 0.43));
  return Math.max(44, Math.min(byLength, fits));
}

/** Marks only a work's own words as a quotation, never a caption or a title. */
function quoted(body: StoryExcerpt) {
  if (body.source !== "text") return body.lines;
  return body.lines.map((line, index) => {
    const first = index === 0 ? "“" : "";
    const last = index === body.lines.length - 1 ? "”" : "";
    return `${first}${line}${last}`;
  });
}

/**
 * The 1080×1920 story. The featured image takes the top of the frame and the
 * opening lines of the featured work sit under it, with the name and the
 * address. With no image it is type only: the lines fill the frame.
 */
export function creatorStoryImage({
  portfolio,
  handleKey,
  image,
  fonts = {},
}: {
  portfolio: PortfolioData;
  handleKey: string;
  image?: string;
  fonts?: ShareFonts;
}) {
  const name = portfolio.name || `@${handleKey}`;
  const body = storyBody(portfolio);
  const lines = body ? quoted(body) : [];
  const editorial = shareFamily(fonts, "editorial");
  const data = shareFamily(fonts, "data");
  const ui = shareFamily(fonts, "interface");
  const italic = fonts.editorialItalic ? "italic" : "normal";
  const size = quoteSize(lines, Boolean(image));
  const quote = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        fontFamily: editorial,
        fontStyle: italic,
        fontSize: size,
        lineHeight: 1.3,
        letterSpacing: -1,
      }}
    >
      {lines.map((line, index) => (
        <div key={index} style={{ display: "flex" }}>
          {line}
        </div>
      ))}
    </div>
  );
  // With no picture and no words, the name itself is the image.
  const nameOnly = !image && lines.length === 0;
  const identity = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 760,
        }}
      >
        {!nameOnly && (
          <div
            style={{
              display: "flex",
              fontFamily: editorial,
              fontSize: nameSize(name),
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontFamily: data,
            fontSize: 36,
            color: COLOR.border,
          }}
        >
          {profileAddress(handleKey)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          fontFamily: editorial,
          fontSize: 56,
          color: COLOR.border,
        }}
      >
        Missa
      </div>
    </div>
  );
  const centre = nameOnly ? (
    <div
      style={{
        display: "flex",
        fontFamily: editorial,
        fontSize: name.length <= 16 ? 160 : name.length <= 24 ? 120 : 84,
        lineHeight: 1,
        letterSpacing: -4,
      }}
    >
      {name}
    </div>
  ) : (
    lines.length > 0 && quote
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: COLOR.ink,
        color: COLOR.canvas,
        fontFamily: ui,
      }}
    >
      {image && (
        <img
          src={image}
          alt=""
          width={STORY_WIDTH}
          height={PICTURE_HEIGHT}
          style={{ objectFit: "cover" }}
        />
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: image ? "72px 80px 88px" : "160px 88px 120px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: image ? "flex-start" : "center",
          }}
        >
          {centre}
        </div>
        {identity}
      </div>
    </div>,
    {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      fonts: shareFontList(fonts),
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    },
  );
}
