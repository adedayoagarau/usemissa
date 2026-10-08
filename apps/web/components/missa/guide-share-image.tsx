import { ImageResponse } from "next/og";
import { EMAIL_COLORS as COLOR } from "@/emails/components/base-layout";
import { COLLECTION_PALETTE } from "@/components/design-system/collection-palette";
import { EditorialMotif } from "@/components/missa/editorial-motif";
import {
  shareFamily,
  shareFontList,
  type ShareFonts,
} from "@/components/creator-profile/share/fonts";
import type { GuideArticle } from "@/lib/guideArticles";

/** The title steps down in size so a long one still fits three lines. */
function titleSize(title: string) {
  if (title.length <= 40) return 76;
  if (title.length <= 60) return 66;
  if (title.length <= 80) return 58;
  return 50;
}

/**
 * The 1200×630 card used when a guide is shared or shown in search: the
 * title, section and byline beside the guide's cover in its collection
 * palette and motif.
 */
export function guideShareImage({
  article,
  fonts = {},
}: {
  article: Pick<
    GuideArticle,
    "title" | "section" | "palette" | "motif" | "author" | "readingMinutes"
  >;
  fonts?: ShareFonts;
}) {
  const palette = COLLECTION_PALETTE[article.palette];
  const editorial = shareFamily(fonts, "editorial");
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
          padding: "64px 56px 56px 72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: COLOR.forest600 }}>
          {`Missa guides · ${article.section}`}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: editorial,
            fontSize: titleSize(article.title),
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
          }}
        >
          {article.title}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: COLOR.inkMuted }}>
          {`${article.author.name} · ${article.readingMinutes} min read`}
        </div>
      </div>
      <div
        style={{
          width: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: palette.surface,
          color: palette.graphic,
        }}
      >
        <EditorialMotif motif={article.motif} size={220} />
      </div>
    </div>,
    { width: 1200, height: 630, fonts: shareFontList(fonts) },
  );
}
