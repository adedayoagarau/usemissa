"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import styles from "./homepage-standard.module.css";

/** Answers from the messaging guide's homepage pass (docs/missa-messaging.md). */
const QUESTIONS = [
  {
    q: "Do I need an account?",
    a: "Not to browse. You need one to save calls, get reminders and build a portfolio. It's free.",
  },
  {
    q: "Where do I apply?",
    a: "Usually on the organizer's own page. Every call links straight to it, and a few you can submit through Missa.",
  },
  {
    q: "Are all calls free to enter?",
    a: "No. Some organizers charge a fee, and every call shows it. Use the No fee filter to see only free ones.",
  },
  {
    q: "How do I check whether I’m eligible?",
    a: "Start with who can apply on the call, then read the organizer’s guidelines. If we couldn’t confirm a detail, the call says so.",
  },
  {
    q: "Can I search more than one discipline?",
    a: "Yes. Pick as many as you like and change them any time. Poets who paint are welcome.",
  },
  {
    q: "Is my portfolio public?",
    a: "Only when you say so. Drafts stay private until you publish.",
  },
];

export function HomepageQuestions() {
  return (
    <Accordion className={styles.questions}>
      {QUESTIONS.map(({ q, a }, index) => (
        <AccordionItem key={q} value={`question-${index}`} className={styles.questionItem}>
          <AccordionTrigger className={styles.questionTrigger}>{q}</AccordionTrigger>
          <AccordionContent className={styles.questionContent}>
            <p>{a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
