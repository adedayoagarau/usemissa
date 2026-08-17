/* eslint-disable @next/next/no-img-element -- ImageResponse renders standard image elements. */
import type { ProfileSocialCardData } from "@/lib/profile-social-card";

export function ProfileSocialCardImage({
  card,
}: {
  card: ProfileSocialCardData;
}) {
  const selectedWorkMeta = card.selectedWork
    ? [card.selectedWork.publication, card.selectedWork.year]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        color: "#171418",
        padding: "64px 72px",
        fontFamily: "Ysabeau",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "32px",
          borderBottom: "1px solid #e6e1e8",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "26px",
            fontWeight: 650,
            letterSpacing: "0.24em",
          }}
        >
          M / SSA
        </div>
        <div
          style={{
            display: "flex",
            color: "#6d6670",
            fontFamily: "Fragment Mono",
            fontSize: "18px",
          }}
        >
          usemissa.com/@{card.handle}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: "48px",
        }}
      >
        <div
          style={{
            width: "168px",
            height: "212px",
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: "1px solid #e6e1e8",
            borderRadius: "14px",
            background: "#f5ecd9",
            color: "#78551e",
            fontSize: "54px",
            fontWeight: 500,
          }}
        >
          {card.profileImageUrl ? (
            <img
              src={card.profileImageUrl}
              alt=""
              width={168}
              height={212}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            card.initials
          )}
        </div>

        <div
          style={{
            minWidth: 0,
            display: "flex",
            flex: 1,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "70px",
              fontWeight: 430,
              lineHeight: 0.98,
              letterSpacing: "-0.035em",
            }}
          >
            {card.displayName}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "14px",
              color: "#6d6670",
              fontFamily: "Fragment Mono",
              fontSize: "22px",
            }}
          >
            @{card.handle}
          </div>
          {card.headline ? (
            <div
              style={{
                display: "flex",
                marginTop: "28px",
                color: "#5a3f68",
                fontFamily: "Fragment Mono",
                fontSize: "19px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {card.headline}
            </div>
          ) : null}
          {card.oneLine ? (
            <div
              style={{
                display: "flex",
                marginTop: "16px",
                maxWidth: "700px",
                color: "#473050",
                fontSize: "29px",
                lineHeight: 1.2,
              }}
            >
              {card.oneLine}
            </div>
          ) : null}
        </div>
      </div>

      {card.selectedWork ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "40px",
            paddingTop: "28px",
            borderTop: "1px solid #e6e1e8",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#5a3f68",
              fontFamily: "Fragment Mono",
              fontSize: "16px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Selected Work
          </div>
          <div
            style={{
              display: "flex",
              minWidth: 0,
              flex: 1,
              justifyContent: "flex-end",
              gap: "18px",
              fontSize: "27px",
              lineHeight: 1,
            }}
          >
            <span>{card.selectedWork.title}</span>
            {selectedWorkMeta ? (
              <span style={{ color: "#6d6670" }}>{selectedWorkMeta}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
