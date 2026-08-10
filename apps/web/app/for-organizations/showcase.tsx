'use client';

import { useState } from 'react';
import { ArrowRight, Check, CircleCheck, FileText, Mail, MoreHorizontal, Star } from 'lucide-react';
import styles from './org.module.css';

const modes = [
  { id: 'portal', label: 'Public portal' },
  { id: 'review', label: 'Review workspace' },
  { id: 'decisions', label: 'Decisions' },
] as const;

type Mode = (typeof modes)[number]['id'];

const applicants = [
  {
    name: 'Avery Chen',
    city: 'Vancouver, BC',
    score: '88',
    status: 'In review',
    tone: 'amber',
  },
  {
    name: 'Jade Okafor',
    city: 'Lagos, NG',
    score: '91',
    status: 'Shortlisted',
    tone: 'violet',
  },
  {
    name: 'Marco Ruiz',
    city: 'Mexico City, MX',
    score: '81',
    status: 'Decision ready',
    tone: 'green',
  },
  {
    name: 'Samira Patel',
    city: 'Mumbai, IN',
    score: '76',
    status: 'In review',
    tone: 'amber',
  },
];

const statusClass: Record<string, string> = {
  amber: styles.statusamber,
  violet: styles.statusviolet,
  green: styles.statusgreen,
};

export function OrgProductShowcase() {
  const [mode, setMode] = useState<Mode>('portal');

  return (
    <div className={styles.showcase}>
      <p className={styles.showcaseIndex}>Illustrative product views</p>
      <div className={styles.showcaseTabs} role="tablist" aria-label="Product views">
        {modes.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} className={mode === item.id ? styles.showcaseTabActive : styles.showcaseTab} onClick={() => setMode(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'portal' && (
        <div className={styles.showcaseGrid}>
          <div className={styles.showcaseNarrative}>
            <span className={styles.showcaseIndex}>01 / APPLICANT EXPERIENCE</span>
            <h3>Keep the call clear enough to say yes to.</h3>
            <p>A branded application page with the deadline, fee, requirements, and next step in view.</p>
            <div className={styles.showcaseChecks}>
              <span>
                <Check aria-hidden="true" size={14} /> Requirements visible
              </span>
              <span>
                <Check aria-hidden="true" size={14} /> Autosave on
              </span>
              <span>
                <Check aria-hidden="true" size={14} /> Status stays clear
              </span>
            </div>
          </div>
          <div className={styles.portalMock}>
            <div className={styles.mockHeader}>
              <span className={styles.mockWordmark}>NORTHLINE</span>
              <span>Programs&nbsp;&nbsp; About&nbsp;&nbsp; Support</span>
            </div>
            <div className={styles.mockRule} />
            <span className={styles.mockKicker}>OPEN CALL / FALL 2026</span>
            <h4>2027 Studio Residency</h4>
            <p>For artists working across image, object, and place.</p>
            <div className={styles.mockDetails}>
              <span>
                <FileText aria-hidden="true" size={14} /> Application
              </span>
              <strong>4 steps · Save as you go</strong>
              <span>
                <CircleCheck aria-hidden="true" size={14} /> Deadline
              </span>
              <strong>Aug 28, 2026</strong>
            </div>
            <button type="button" className={styles.mockButton}>
              Start application <ArrowRight aria-hidden="true" size={14} />
            </button>
            <small>Powered by Missa · Review every answer before sending.</small>
          </div>
        </div>
      )}

      {mode === 'review' && (
        <div className={styles.reviewShowcase}>
          <div className={styles.showcaseNarrative}>
            <span className={styles.showcaseIndex}>02 / TEAM WORKSPACE</span>
            <h3>Give every reviewer the same context.</h3>
            <p>Keep work samples, notes, assignments, and decisions together so the conversation can move forward.</p>
            <div className={styles.showcaseChecks}>
              <span>
                <Check aria-hidden="true" size={14} /> Assign by round
              </span>
              <span>
                <Check aria-hidden="true" size={14} /> Compare scores
              </span>
              <span>
                <Check aria-hidden="true" size={14} /> Export when needed
              </span>
            </div>
          </div>
          <div className={styles.workspaceMock}>
            <div className={styles.workspaceTop}>
              <div>
                <span>Northline Arts Foundation</span>
                <strong>2027 Studio Residency</strong>
              </div>
              <button type="button" aria-label="More review options">
                <MoreHorizontal size={17} />
              </button>
            </div>
            <div className={styles.workspaceTabs}>
              <span className={styles.workspaceTabActive}>All 132</span>
              <span>In review 52</span>
              <span>Shortlisted 18</span>
              <span>Decision ready 7</span>
            </div>
            <div className={styles.reviewTable}>
              <div className={styles.reviewRowHeader}>
                <span>Applicant</span>
                <span>Reviewer</span>
                <span>Score</span>
                <span>Status</span>
              </div>
              {applicants.map((applicant) => (
                <div className={styles.reviewRow} key={applicant.name}>
                  <div className={styles.applicant}>
                    <span>{applicant.name.slice(0, 2)}</span>
                    <div>
                      <strong>{applicant.name}</strong>
                      <small>{applicant.city}</small>
                    </div>
                  </div>
                  <span className={styles.reviewer}>
                    <span>ER</span>
                    <span>MK</span>
                  </span>
                  <strong className={styles.score}>{applicant.score}</strong>
                  <span className={`${styles.status} ${statusClass[applicant.tone]}`}>{applicant.status}</span>
                </div>
              ))}
            </div>
            <div className={styles.workspaceFooter}>
              <span>Showing 1–4 of 132</span>
              <a href="/signup?next=%2Fworkspace">
                Open organization area <ArrowRight aria-hidden="true" size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {mode === 'decisions' && (
        <div className={styles.decisionShowcase}>
          <div className={styles.showcaseNarrative}>
            <span className={styles.showcaseIndex}>03 / DECISION FLOW</span>
            <h3>Make the final step feel finished.</h3>
            <p>Keep decision notes private, queue outcome emails, and leave a useful record for the next cycle.</p>
            <div className={styles.showcaseChecks}>
              <span>
                <Check aria-hidden="true" size={14} /> Templates ready
              </span>
              <span>
                <Check aria-hidden="true" size={14} /> Send when ready
              </span>
              <span>
                <Check aria-hidden="true" size={14} /> Decision history attached
              </span>
            </div>
          </div>
          <div className={styles.decisionMock}>
            <div className={styles.decisionTop}>
              <span>DECISION QUEUE</span>
              <span>Aug 15, 2026</span>
            </div>
            <div className={styles.decisionItem}>
              <div className={styles.decisionIcon}>
                <Star aria-hidden="true" size={16} />
              </div>
              <div>
                <strong>Jade Okafor</strong>
                <span>Shortlisted · 91 score</span>
              </div>
              <CircleCheck className={styles.decisionCheck} aria-hidden="true" size={18} />
            </div>
            <div className={styles.decisionItem}>
              <div className={styles.decisionIcon}>
                <Mail aria-hidden="true" size={16} />
              </div>
              <div>
                <strong>12 outcome emails</strong>
                <span>Drafted and ready to review</span>
              </div>
              <ArrowRight className={styles.decisionCheck} aria-hidden="true" size={18} />
            </div>
            <div className={styles.decisionCallout}>
              <span>All decisions are saved to the opportunity record.</span>
              <a href="#faq">
                Read about decisions <ArrowRight aria-hidden="true" size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
