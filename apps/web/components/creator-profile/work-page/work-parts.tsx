import { stanzas, workBlocks, type WorkPart } from "@/lib/creator-work-page";
import { PlateImage } from "./plate-image";
import { RecordingPlayer } from "./recording-player";
import styles from "./work-page.module.css";

function Reading({ text }: { text: string }) {
  return (
    <div className={`${styles.reading} font-heading`}>
      {stanzas(text).map((block, index) => (
        <p key={index}>{block}</p>
      ))}
    </div>
  );
}

function TextPart({ part, many }: { part: WorkPart; many: boolean }) {
  return (
    <section
      id={part.anchor}
      className={styles.part}
      aria-labelledby={`${part.anchor}-title`}
    >
      <header className={styles.partHead}>
        {many && part.title && (
          <p className={`${styles.partLabel} font-mono`}>{part.label}</p>
        )}
        <h2
          id={`${part.anchor}-title`}
          className={`${styles.partTitle} font-heading`}
        >
          {part.heading}
        </h2>
      </header>
      <Reading text={part.text} />
      {part.caption && <p className={styles.note}>{part.caption}</p>}
    </section>
  );
}

function Plates({ parts }: { parts: WorkPart[] }) {
  const id = `${parts[0].anchor}-group`;
  return (
    <section className={styles.part} aria-labelledby={id}>
      <div className={styles.groupHead}>
        <h2 id={id} className={`${styles.groupTitle} font-heading`}>
          {parts.length === 1 ? "Plate" : "Plates"}
        </h2>
      </div>
      <ul className={styles.plates} data-count={parts.length === 1 ? 1 : 2}>
        {parts.map((part, index) => (
          <li key={part.anchor} id={part.anchor}>
            <figure className={styles.plate}>
              <div className={styles.plateFrame}>
                <PlateImage
                  src={part.image}
                  alt={part.caption}
                  eager={index === 0 && part.number === 1}
                />
              </div>
              <figcaption>
                {part.title ? (
                  <em className="font-heading">{part.title}</em>
                ) : (
                  <span />
                )}
                <span className="font-mono">{part.label}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A recording is its own object on the page: label, title, note, then the player. */
export function Recording({
  anchor,
  label,
  title,
  note,
  src,
}: {
  anchor?: string;
  label: string;
  title: string;
  note?: string;
  src: string;
}) {
  const id = `${anchor ?? "recording"}-title`;
  return (
    <section id={anchor} className={styles.recording} aria-labelledby={id}>
      <header className={styles.partHead}>
        <p className={`${styles.partLabel} font-mono`}>{label}</p>
        <h2 id={id} className={`${styles.partTitle} font-heading`}>
          {title}
        </h2>
        {note && <p className={styles.note}>{note}</p>}
      </header>
      <RecordingPlayer src={src} title={title} />
    </section>
  );
}

/** The parts of a work in the creator's order. */
export function WorkParts({ parts }: { parts: WorkPart[] }) {
  const many = parts.length > 1;
  return (
    <div className={styles.parts}>
      {workBlocks(parts).map((block) => {
        if (block.type === "plates")
          return <Plates key={block.parts[0].anchor} parts={block.parts} />;
        if (block.type === "recording")
          return (
            <Recording
              key={block.part.anchor}
              anchor={block.part.anchor}
              label={block.part.label}
              title={block.part.heading}
              note={block.part.caption}
              src={block.part.audio}
            />
          );
        return (
          <TextPart key={block.part.anchor} part={block.part} many={many} />
        );
      })}
    </div>
  );
}
