export type EditorialMotifName = "orbit" | "burst" | "steps" | "frame";

/**
 * The decorative motif on editorial covers (discovery collections and guides).
 * It draws in `currentColor`, so the cover's graphic role sets its color, and
 * it is hidden from assistive technology by the cover that holds it.
 */
export function EditorialMotif({ motif }: { motif: EditorialMotifName }) {
  return (
    <svg viewBox="0 0 240 240" focusable="false" aria-hidden="true">
      {motif === "burst" ? (
        Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d="M120 18 L130 85 L120 100 L110 85 Z"
            transform={`rotate(${i * 22.5} 120 120)`}
            fill="currentColor"
          />
        ))
      ) : motif === "steps" ? (
        <>
          <path
            d="M30 200V150H80V100H130V50H180V10H220V200Z"
            fill="currentColor"
          />
          <path d="M10 220H230" stroke="currentColor" strokeWidth="2" />
        </>
      ) : motif === "frame" ? (
        [0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={24 + i * 18}
            y={24 + i * 12}
            width={180 - i * 36}
            height={192 - i * 24}
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            transform={`rotate(${i * 7} 120 120)`}
          />
        ))
      ) : (
        <>
          {[0, 60, 120].map((angle) => (
            <ellipse
              key={angle}
              cx="120"
              cy="120"
              rx="100"
              ry="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              transform={`rotate(${angle} 120 120)`}
            />
          ))}
          <circle cx="120" cy="120" r="14" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
