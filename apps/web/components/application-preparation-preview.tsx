"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Copy, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import styles from "./application-preparation-preview.module.css";

const works = [
  {
    title: "The distance home",
    version: "Revision 3",
    text: "The distance home\n\nSample manuscript for this design preview.\nNo actual creative work is included.",
  },
  {
    title: "After the last train",
    version: "Revision 1",
    text: "After the last train\n\nSample manuscript for this design preview.\nNo actual creative work is included.",
  },
];

export function ApplicationPreparationPreview() {
  const [selected, setSelected] = useState("0");
  const [letter, setLetter] = useState(
    "Dear Salt Hill editors,\n\nThank you for considering my story for publication.\n\nBest,\nRiley Chen",
  );
  const [bio, setBio] = useState(
    "Riley Chen is a writer and sound artist based in Manchester.",
  );
  const [feedback, setFeedback] = useState("");
  const [copying, setCopying] = useState(false);
  const work = selected === "" ? undefined : works[Number(selected)];
  async function copy(text: string, label: string) {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(`${label} copied. Paste it into the official form.`);
    } catch {
      setFeedback(
        "Copy was unavailable. Select the text and copy it manually.",
      );
    } finally {
      setCopying(false);
    }
  }
  function download() {
    if (!work) return;
    const url = URL.createObjectURL(
      new Blob([work.text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${work.title}-sample.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback(
      "Sample file downloaded. This preview contains no real manuscript.",
    );
  }
  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/opportunities">MISSA</Link>
        <span>Design preview · sample materials · edits reset on reload</span>
      </div>
      <header className={styles.header}>
        <p className={styles.kicker}>Application preparation</p>
        <h1>Fiction at Salt Hill</h1>
        <p>
          Bring your work and introduction together. Finish your submission on
          Submittable.
        </p>
      </header>
      <div className={styles.layout}>
        <div>
          <section className={styles.section} aria-labelledby="work-heading">
            <div className={styles.sectionHeading}>
              <span>01</span>
              <h2 id="work-heading">Choose your work</h2>
            </div>
            <Field>
              <FieldLabel htmlFor="work">From your works</FieldLabel>
              <NativeSelect
                id="work"
                className={styles.select}
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Choose a work</option>
                {works.map((item, index) => (
                  <option value={index} key={item.title}>
                    {item.title} · {item.version}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {work ? (
              <div className={styles.manuscript}>
                <FileText aria-hidden="true" />
                <div>
                  <h3>{work.title}</h3>
                  <p>{work.version} · sample TXT file</p>
                </div>
                <Button variant="outline" onClick={download}>
                  <Download /> Download
                </Button>
              </div>
            ) : (
              <p>Select a work to see its version and download it.</p>
            )}
            <Button
              variant="outline"
              disabled={!work || copying}
              onClick={() => void copy(work!.title, "Title")}
            >
              <Copy /> Copy title
            </Button>
          </section>
          <section className={styles.section} aria-labelledby="letter-heading">
            <div className={styles.sectionHeading}>
              <span>02</span>
              <h2 id="letter-heading">Your introduction</h2>
            </div>
            <p className={styles.muted}>
              The form asks for a cover letter with a third-person bio. Copy
              them together when you’re ready.
            </p>
            <Field>
              <FieldLabel htmlFor="letter">Cover letter</FieldLabel>
              <Textarea
                id="letter"
                value={letter}
                onChange={(event) => setLetter(event.target.value)}
                rows={7}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bio">Third-person bio</FieldLabel>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
              />
            </Field>
            <Button
              variant="outline"
              disabled={!letter.trim() || !bio.trim() || copying}
              onClick={() =>
                void copy(`${letter.trim()}\n\n${bio.trim()}`, "Letter and bio")
              }
            >
              <Copy /> {copying ? "Copying…" : "Copy letter and bio"}
            </Button>
            <p className={styles.feedback} role="status">
              {feedback}
            </p>
          </section>
        </div>
        <aside className={styles.aside} aria-label="Submission guidance">
          <p className={styles.kicker}>Before you continue</p>
          <h2>A final check</h2>
          <ul>
            <li>Unpublished fiction, up to 25 pages.</li>
            <li>Double-spaced, unless the work requires otherwise.</li>
            <li>PDF, DOC, DOCX, TXT or RTF attachment.</li>
            <li>Include a third-person bio with your letter.</li>
          </ul>
          <p className={styles.source}>
            Research snapshot · September 5, 2026. Check the official page for
            the current reading window and requirements.
          </p>
          <div className={styles.handoff}>
            <h3>Continue on Submittable</h3>
            <p>
              Paste your title and letter, attach your file, and review the
              remaining questions there.
            </p>
            <Button
              render={
                <a
                  href="https://salthill.submittable.com/submit/1504/fiction"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Open official form <ArrowUpRight />
            </Button>
            <p className={styles.source}>
              Opens a new tab. Opening the form does not mark this as submitted.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
