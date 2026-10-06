"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import styles from "./homepage-standard.module.css";

const QUESTIONS = [
  {
    q: "Do I need an account?",
    a: "No. Browse opportunities and read the details without an account. Create one to keep a shortlist, track deadlines and build a portfolio.",
  },
  {
    q: "Where do I apply?",
    a: "Open an opportunity and follow the link to the organizer’s official page. Each organizer sets its own requirements and handles submissions.",
  },
  {
    q: "Are all applications free?",
    a: "Some organizers charge a fee. Use the no-fee filter to find opportunities without an application fee.",
  },
  {
    q: "How do I check whether I’m eligible?",
    a: "Read the eligibility rules and submission guidelines on the opportunity page. Check the organizer’s website for any missing details.",
  },
  {
    q: "Can I search more than one discipline?",
    a: "Yes. You can select several disciplines and change them at any time.",
  },
  {
    q: "Is my portfolio public?",
    a: "Your draft stays private until you publish it.",
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
