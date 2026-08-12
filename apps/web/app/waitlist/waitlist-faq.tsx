'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { PlusIcon } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { waitlistFaqs } from './waitlist-faq-content'
import styles from './waitlist.module.css'

export function WaitlistFaq() {
  return (
    <section className={styles.faqSection} aria-labelledby="waitlist-faq-heading">
      <div className={styles.faqIntro}>
        <p className={styles.faqLead}>
          Missa helps you find the calls that fit your work, prepare what you need, and stay on top of every deadline—with the original source close at hand.
        </p>
        <p className={styles.faqSupporting}>
          Find grants, residencies, fellowships, contests, magazines, commissions, and open calls. See the deadline, requirements, fee, eligibility, and original source before you decide.
        </p>
        <h2 id="waitlist-faq-heading">How Missa helps you move from search to submission.</h2>
      </div>

      <Accordion className={styles.faqList} defaultValue={['what-does-missa-do']} hiddenUntilFound>
        {waitlistFaqs.map((item, index) => {
          const value = item.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

          return (
            <AccordionItem key={value} value={value} className={styles.faqItem}>
              <AccordionPrimitive.Header className={styles.faqHeader}>
                <AccordionPrimitive.Trigger className={styles.faqTrigger}>
                  <span className={styles.faqQuestion}>
                    <span className={styles.faqIndex}>{String(index + 1).padStart(2, '0')}</span>
                    {item.question}
                  </span>
                  <PlusIcon aria-hidden="true" className={styles.faqIcon} />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionContent className={styles.faqContent}>
                <p>{item.answer}</p>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}
