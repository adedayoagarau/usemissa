#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve(process.cwd());
const EXPO_MAP_DIR = path.join(ROOT_DIR, '.expo-map');
const FLOWS_DIR = path.join(EXPO_MAP_DIR, 'flows');
const SCREENS_DIR = path.join(EXPO_MAP_DIR, 'screens');
const OUTPUTS_DIR = path.join(ROOT_DIR, 'outputs');

// Ensure directories exist
for (const dir of [EXPO_MAP_DIR, FLOWS_DIR, SCREENS_DIR, OUTPUTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --------------------------------------------------------------------------
// 1. ALL APPLICATION NODES (SCREENS & RUNTIME STATES)
// --------------------------------------------------------------------------
const NODES = [
  // Subsystem 1: Public Discovery & Onboarding
  {
    id: "home",
    title: "Homepage / Editorial Showcase",
    route: "/",
    group: "public",
    category: "Public Discovery",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Direct URL or Google search for creative opportunities",
    description: "The welcome front door where creators discover hand-curated literary, visual art, and fellowship opportunities.",
    plainExplanation: "Where new visitors land. Shows curated spotlights, top deadlines closing this week, and a quick search bar to explore calls.",
    primaryActions: ["Search by keyword", "Filter by discipline", "Click featured opportunity", "Sign in button"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Standard View", note: "Shows hero banner, discipline tags, and closing-soon opportunities." },
      { id: "with-search", name: "Active Search Filter", note: "Shows real-time matching results for 'Poetry Grant'." }
    ]
  },
  {
    id: "opportunities-list",
    title: "Opportunities Catalog",
    route: "/opportunities",
    group: "public",
    category: "Public Discovery",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Organic search, bookmarks, or 'Browse All' from homepage",
    description: "Comprehensive filterable directory of verified open calls, prizes, fellowships, and grants.",
    plainExplanation: "The search directory. Creators filter by genre (Poetry, Fiction, Visual Art), fee status (Free vs Paid), and deadline urgency.",
    primaryActions: ["Filter by Fee (No Fee / Paid)", "Filter by Discipline", "Sort by Deadline", "Select Opportunity Card"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "All Open Calls", note: "Shows active calls sorted by closest deadline." },
      { id: "filtered-no-fee", name: "Free Submissions Only", note: "Filtered view for zero-fee opportunities." },
      { id: "empty", name: "Zero Search Results", note: "Edge case: Friendly message suggesting broadening filters." }
    ]
  },
  {
    id: "opportunity-detail",
    title: "Opportunity Detail & Facts",
    route: "/opportunities/[id]",
    group: "public",
    category: "Public Discovery",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Shared link on social media (Twitter/Substack/Instagram) or direct email",
    description: "In-depth breakdown of rules, eligibility, fee facts, required files, and official source link.",
    plainExplanation: "The decision page. Gives the creator 4 clear steps: (1) Decide if eligible, (2) See what files to prepare, (3) Understand rules, (4) Go to official submission link.",
    primaryActions: ["Save to Tracker", "View Official Source", "Check Preparation Checklist", "Report Inaccurate Fact"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Standard Verified Call", note: "All verified facts: deadline date, no-fee badge, required files." },
      { id: "in-tracker", name: "Already Saved in Tracker", note: "Button turns green showing 'In Tracker' with prep checklist enabled." },
      { id: "conflicting-deadline", name: "Conflicting Deadline Alert", note: "Warning banner advising creator to double-check official source." },
      { id: "closed", name: "Closed / Archived", note: "Opportunity has passed deadline. Shows archive notice." }
    ]
  },
  {
    id: "login",
    title: "Sign In / Magic Link",
    route: "/login",
    group: "public",
    category: "Identity & Access",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Auth redirect when clicking 'Save to Tracker' or direct link",
    description: "Passwordless sign-in using secure email magic link with intent preservation.",
    plainExplanation: "Quick, password-free login. The system remembers what opportunity you wanted to save and automatically saves it as soon as you verify.",
    primaryActions: ["Enter email address", "Click 'Send Magic Link'", "Open email link", "Continue as Guest"],
    successPoint: false,
    status: "auth-wall",
    states: [
      { id: "default", name: "Email Entry", note: "Clean input asking for user email." },
      { id: "link-sent", name: "Magic Link Sent", note: "Confirmation banner: 'Check your inbox for sign-in link'." },
      { id: "with-intent", name: "Preserved Save Intent", note: "Banner: 'Sign in to save African Poetry Prize to your tracker'." }
    ]
  },
  {
    id: "for-organizations",
    title: "Publisher & Organization Hub",
    route: "/for-organizations",
    group: "public",
    category: "Publisher Acquisition",
    persona: "publisher",
    entryPoint: true,
    entryDescription: "Partner links, marketing campaigns, or footer link",
    description: "Overview of Missa's submission management and blind evaluation platform for journals and institutions.",
    plainExplanation: "Landing page for publishers, magazines, and foundations explaining how Missa helps manage open calls, readers, and payout delivery.",
    primaryActions: ["Create Organization Account", "Schedule Live Demo", "Explore Features"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Feature Overview", note: "Highlights blind review, rubric builder, and outcome desk." }
    ]
  },

  // Subsystem 2: Creator Passport
  {
    id: "passport-home",
    title: "Creator Dashboard",
    route: "/home",
    group: "passport",
    category: "Creator Passport",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Default landing for logged-in creators",
    description: "Personalized mission control displaying upcoming deadlines, active tracker items, and recommendations.",
    plainExplanation: "The creator's private workspace. Shows what is due this week, recent submission updates, and matched calls based on past work.",
    primaryActions: ["View upcoming deadlines", "Jump to Tracker", "Upload work to Library", "Explore recommendations"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Active Pipeline", note: "Displays 3 calls due soon, 2 submitted under review." },
      { id: "empty", name: "First-Time User", note: "Welcome checklist encouraging user to save their first opportunity." }
    ]
  },
  {
    id: "tracker",
    title: "Opportunity Tracker (Kanban / List)",
    route: "/tracker",
    group: "passport",
    category: "Creator Passport",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Sidebar navigation or email reminder",
    description: "Personal pipeline managing opportunities across 6 stages: Saved, Preparing, Submitted, Under Review, Accepted, Declined.",
    plainExplanation: "The Kanban board for your creative career. Move calls from 'Saved' to 'Preparing' to 'Submitted', with automated reminders before deadlines.",
    primaryActions: ["Drag card to new stage", "Check off required files", "Mark as Submitted", "Add custom notes"],
    successPoint: true,
    successMessage: "Opportunity saved, organized, and tracked with milestone checklist!",
    status: "ok",
    states: [
      { id: "default", name: "Multi-Stage Kanban", note: "Shows cards categorized across columns with deadline tags." },
      { id: "card-expanded", name: "Checklist Drawer Open", note: "Interactive checklist showing file requirements (Manuscript, CV, Bio)." }
    ]
  },
  {
    id: "tracker-submission-detail",
    title: "Submission Status & History",
    route: "/tracker/submissions/[submissionId]",
    group: "passport",
    category: "Creator Passport",
    persona: "submitter",
    entryPoint: true,
    entryDescription: "Notification email when an organization updates submission status",
    description: "Detailed progress timeline for a specific submission including editorial messages and decision letters.",
    plainExplanation: "Where submitters see real-time updates from the publisher, such as 'Under Review', 'Revision Requested', or 'Accepted'.",
    primaryActions: ["Read decision letter", "Respond to publisher message", "Download proof of submission"],
    successPoint: true,
    successMessage: "Complete audit record and delivery tracking for submitted work.",
    status: "ok",
    states: [
      { id: "under-review", name: "In Review Stage", note: "Timeline shows 'Received' -> 'Assigned to Readers'." },
      { id: "accepted", name: "Accepted & Awarded", note: "Celebratory banner with contract delivery and next steps." }
    ]
  },
  {
    id: "library",
    title: "Creator Work Library & Portfolio",
    route: "/library",
    group: "passport",
    category: "Creator Passport",
    persona: "submitter",
    entryPoint: false,
    description: "Secure vault storing creative manuscripts, poems, artist CVs, and cover letters ready for submission.",
    plainExplanation: "Your digital portfolio vault. Keep your polished poems, essays, and artist bio in one place so applying takes seconds.",
    primaryActions: ["Upload manuscript (PDF/DOCX)", "Create new work entry", "Tag genres/word counts", "Attach to Opportunity"],
    successPoint: true,
    successMessage: "Creative work archived, formatted, and ready for recurring submissions.",
    status: "ok",
    states: [
      { id: "default", name: "Vault with 5 Works", note: "Lists manuscripts with word counts, genre badges, and submission count." },
      { id: "upload-modal", name: "Upload Modal Open", note: "Drag-and-drop file upload with title and bio editor." }
    ]
  },
  {
    id: "calendar",
    title: "Deadline Timeline & Calendar",
    route: "/calendar",
    group: "passport",
    category: "Creator Passport",
    persona: "submitter",
    entryPoint: false,
    description: "Monthly and weekly visual timeline highlighting submission windows and expiring grants.",
    plainExplanation: "Calendar view of all your deadlines so you never miss a submission cutoff.",
    primaryActions: ["Switch to Month/Week view", "Sync to Google/Apple Calendar", "Click date to view calls"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Month View", note: "Dates highlighted with color-coded submission deadlines." }
    ]
  },

  // Subsystem 3: Organization Workspace
  {
    id: "org-overview",
    title: "Organization Workspace Overview",
    route: "/organization/[id]/overview",
    group: "workspace",
    category: "Organization Workspace",
    persona: "publisher",
    entryPoint: true,
    entryDescription: "Publisher login or staff invitation",
    description: "Command dashboard for magazines, presses, and foundations managing active calls and reader teams.",
    plainExplanation: "The organization control room. Displays submission volume, reader progress, upcoming cutoffs, and team workload.",
    primaryActions: ["Launch new Open Call", "View Submissions queue", "Assign readers", "Open Outcome Desk"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Active Open Call", note: "Shows 142 submissions received, 85% reviewed, deadline in 6 days." }
    ]
  },
  {
    id: "org-opportunities",
    title: "Open Call Manager & Builder",
    route: "/organization/[id]/opportunities",
    group: "workspace",
    category: "Organization Workspace",
    persona: "publisher",
    entryPoint: false,
    description: "Create, schedule, edit, and publish calls with custom file requirements, eligibility rules, and rubrics.",
    plainExplanation: "Where editors build open calls: set deadlines, define guidelines, set submission fees, and build scoring rubrics.",
    primaryActions: ["Create Call", "Configure Intake Fields", "Set Evaluation Rubric", "Publish to Missa Radar"],
    successPoint: true,
    successMessage: "Open call published live and automatically discoverable worldwide!",
    status: "ok",
    states: [
      { id: "builder", name: "Intake Form Builder", note: "Configuring required files (e.g. 3-5 poems, Blind PDF)." },
      { id: "live", name: "Published & Active", note: "Call is live with public link and QR code." }
    ]
  },
  {
    id: "org-submissions",
    title: "Submissions Pipeline & Triage",
    route: "/organization/[id]/submissions",
    group: "workspace",
    category: "Organization Workspace",
    persona: "publisher",
    entryPoint: false,
    description: "High-density table and kanban managing all incoming applicant packages, reader assignments, and tags.",
    plainExplanation: "The submissions inbox. Editors filter by score, assign guest judges, and flag standout manuscripts.",
    primaryActions: ["Filter by Average Score", "Assign Reviewers", "Toggle Blind Review Mode", "Batch Move to Decision Desk"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "Table of 142 Entries", note: "Shows blind IDs, genre, assigned readers, and composite scores." },
      { id: "filtered-top", name: "Top 10 Finalists", note: "Filtered view for manuscripts scored >= 4.5/5.0." }
    ]
  },
  {
    id: "org-decisions",
    title: "Outcome Desk & Batch Decisions",
    route: "/organization/[id]/decisions",
    group: "workspace",
    category: "Organization Workspace",
    persona: "publisher",
    entryPoint: false,
    description: "Streamlined acceptance, rejection, and waitlist workflow with customizable letter templates.",
    plainExplanation: "Where editors make final decisions. Send personalized acceptance letters and notify submitters in bulk with one click.",
    primaryActions: ["Select Batch", "Customize Acceptance Letter", "Send Decision Emails", "Trigger Delivery Workflow"],
    successPoint: true,
    successMessage: "Decisions dispatched to submitters and contract workflows initialized!",
    status: "ok",
    states: [
      { id: "batch-selected", name: "5 Acceptances Selected", note: "Shows letter preview and contract attachment options." },
      { id: "dispatched", name: "Decisions Dispatched", note: "Audit confirmation that 142 decision notifications were sent." }
    ]
  },
  {
    id: "org-delivery",
    title: "Delivery & Fulfillment Desk",
    route: "/organization/[id]/delivery",
    group: "workspace",
    category: "Organization Workspace",
    persona: "publisher",
    entryPoint: false,
    description: "Contract signing, hi-res file collection, award payments, and publishing pipeline milestones.",
    plainExplanation: "Post-acceptance hub. Collect signed contributor contracts, payout details, and final publication files.",
    primaryActions: ["Request Contract Signature", "Verify Payment Info", "Download Print Files"],
    successPoint: true,
    successMessage: "Full publishing fulfillment completed!",
    status: "ok",
    states: [
      { id: "pending-contracts", name: "Awaiting 2 Signatures", note: "Tracks signed contributor agreements in real time." }
    ]
  },

  // Subsystem 4: Reviewer Workstation
  {
    id: "reviewer-assignments",
    title: "Reviewer Assigned Queue",
    route: "/reviews",
    group: "reviewer",
    category: "Reviewer Workstation",
    persona: "reviewer",
    entryPoint: true,
    entryDescription: "Direct reviewer invitation link sent via email",
    description: "Clean queue of submissions assigned to the reader with due dates and progress counter.",
    plainExplanation: "The judge/reader's queue. Shows how many manuscripts you need to read and when scores are due.",
    primaryActions: ["Select next unread submission", "Sort by date assigned", "View completed reviews"],
    successPoint: false,
    status: "ok",
    states: [
      { id: "default", name: "12 Pending Reviews", note: "Shows reader progress: 8 completed, 4 remaining." },
      { id: "all-done", name: "All Assignments Completed", note: "Celebratory empty state: 'You are all caught up!'." }
    ]
  },
  {
    id: "reviewer-workstation",
    title: "Blind Review & Scoring Rubric",
    route: "/reviews/[assignmentId]",
    group: "reviewer",
    category: "Reviewer Workstation",
    persona: "reviewer",
    entryPoint: false,
    description: "Distraction-free reading experience with manuscript viewer, criterion scoring sliders, and private notes.",
    plainExplanation: "The evaluation room. Read the submission in blind mode (no author names), score each criterion (e.g. Voice, Craft, Originality), and make a recommendation (Accept / Decline / Strong Yes).",
    primaryActions: ["Read PDF/Text", "Score Rubric Criteria (1-5)", "Enter Private Editorial Note", "Submit Evaluation"],
    successPoint: true,
    successMessage: "Evaluation recorded! Submission advanced to editorial review.",
    status: "ok",
    states: [
      { id: "default", name: "Active Scoring Mode", note: "Manuscript on left, scoring rubric and notes on right." },
      { id: "submitted", name: "Evaluation Submitted", note: "Confirmation banner with quick shortcut to 'Next Submission'." }
    ]
  },

  // Subsystem 5: Platform Admin & Radar
  {
    id: "admin-control",
    title: "Platform Admin Control Room",
    route: "/admin",
    group: "admin",
    category: "Platform Admin",
    persona: "admin",
    entryPoint: true,
    entryDescription: "Restricted platform administrator login",
    description: "System health, ingestion rates, worker status, and platform audit logs.",
    plainExplanation: "The administrative bridge. Platform engineers and curators monitor data crawler health and system integrity.",
    primaryActions: ["Inspect Radar Sources", "Check Worker Leases", "Manage Taxonomy", "View Audit Trails"],
    successPoint: false,
    status: "auth-wall",
    states: [
      { id: "default", name: "Healthy Telemetry", note: "All 18 worker lanes active, 0 dead letter alerts." },
      { id: "forbidden", name: "403 Forbidden Edge Case", note: "Non-admin account attempting access is blocked safely." }
    ]
  },
  {
    id: "admin-radar",
    title: "Radar Source Ingestion & Health",
    route: "/admin/radar",
    group: "admin",
    category: "Platform Admin",
    persona: "admin",
    entryPoint: false,
    description: "Source freshness monitoring, automated extraction agents, and human verification queue.",
    plainExplanation: "The radar engine where automated agents discover calls across the web, extract deadlines, and flag uncertain records for curator approval.",
    primaryActions: ["Approve Extracted Call", "Trigger Source Scrape", "Resolve Conflicting Facts", "Publish to Feed"],
    successPoint: true,
    successMessage: "New opportunity verified and published to global catalog!",
    status: "ok",
    states: [
      { id: "review-queue", name: "2 Calls Need Curator Review", note: "Shows side-by-side comparison of source website vs extracted data." }
    ]
  }
];

// --------------------------------------------------------------------------
// 2. DETAILED END-TO-END USER JOURNEYS (POINT A TO POINT Z)
// --------------------------------------------------------------------------
const JOURNEYS = [
  {
    id: "journey-01-discovery-to-tracker",
    title: "Journey 1: Discovery to Saved Opportunity & Tracker Checklist",
    persona: "Submitter / Creative Individual",
    summary: "From landing on Missa homepage to finding an opportunity, checking eligibility, saving with magic link, and checking off submission requirements.",
    entryPoint: "Homepage (/) via Google Search or Social Link",
    successPoint: "Opportunity saved in personal Tracker with countdown & prep checklist active",
    steps: [
      {
        step: 1,
        nodeId: "home",
        action: "Land on Missa Homepage",
        target: "Search input & Featured Opportunities",
        plainExplanation: "Creator opens Missa. They see curated open calls closing soon and enter 'Poetry Grant' into search.",
        stateVariant: "default",
        marker: { x: 0.5, y: 0.25, label: "Type 'Poetry Grant'" }
      },
      {
        step: 2,
        nodeId: "opportunities-list",
        action: "Filter by Discipline and No-Fee",
        target: "Discipline dropdown & Fee toggle",
        plainExplanation: "They browse search results, filtering for 'Zero Submission Fee' and 'Poetry' to find high-value grants.",
        stateVariant: "filtered-no-fee",
        marker: { x: 0.35, y: 0.38, label: "Click 'No Fee Only'" }
      },
      {
        step: 3,
        nodeId: "opportunity-detail",
        action: "Inspect Key Facts, Deadline & Eligibility",
        target: "Decision rail & Eligibility rules",
        plainExplanation: "Creator reviews the call: deadline is in 14 days, no submission fee, requires 3 poems and a 1-page artist statement.",
        stateVariant: "default",
        marker: { x: 0.72, y: 0.42, label: "Click 'Save to Tracker'" }
      },
      {
        step: 4,
        nodeId: "login",
        action: "Authenticate with Intent-Preserving Magic Link",
        target: "Email input -> 'Send Magic Link'",
        plainExplanation: "Because the user wasn't signed in, Missa prompts for an email, sends a 1-click magic link, and preserves the save intent.",
        stateVariant: "with-intent",
        marker: { x: 0.5, y: 0.55, label: "Enter email & verify" }
      },
      {
        step: 5,
        nodeId: "opportunity-detail",
        action: "Automatic Return & State Transition",
        target: "Save Button turns to 'In Tracker'",
        plainExplanation: "Once verified, Missa returns the user straight back to the opportunity, automatically marks it 'In Tracker', and unlocks the preparation checklist.",
        stateVariant: "in-tracker",
        marker: { x: 0.72, y: 0.42, label: "Check: 'In Tracker' active" }
      },
      {
        step: 6,
        nodeId: "tracker",
        action: "Manage Submission in Personal Kanban",
        target: "Kanban 'Preparing' Column",
        plainExplanation: "Success Point! The call appears on the user's Tracker board. They check off their prepared manuscript and click through to finish on the official source.",
        stateVariant: "card-expanded",
        marker: { x: 0.4, y: 0.6, label: "Success: Checklist complete!" }
      }
    ]
  },
  {
    id: "journey-02-creator-library-submission",
    title: "Journey 2: Upload Work to Library & Track Submission",
    persona: "Submitter / Creator with Portfolio",
    summary: "Creator uploads a manuscript to their private Library vault, links it to an open call, and monitors real-time review progress.",
    entryPoint: "Creator Dashboard (/home)",
    successPoint: "Submission registered, files attached, and tracking progress timeline",
    steps: [
      {
        step: 1,
        nodeId: "passport-home",
        action: "Open Creator Dashboard",
        target: "Library shortcut button",
        plainExplanation: "User logs in and navigates to their private Work Library.",
        stateVariant: "default",
        marker: { x: 0.65, y: 0.3, label: "Click 'Library'" }
      },
      {
        step: 2,
        nodeId: "library",
        action: "Upload New Manuscript",
        target: "Upload Manuscript button",
        plainExplanation: "User uploads 'Selected Poems (2026).pdf', adds a word count, and saves it into their vault.",
        stateVariant: "upload-modal",
        marker: { x: 0.5, y: 0.45, label: "Upload & Save File" }
      },
      {
        step: 3,
        nodeId: "opportunities-list",
        action: "Match Work with Open Call",
        target: "Apply with Library Work button",
        plainExplanation: "User finds an open call from African Poetry Prize and selects their uploaded manuscript.",
        stateVariant: "default",
        marker: { x: 0.6, y: 0.4, label: "Select Call" }
      },
      {
        step: 4,
        nodeId: "tracker",
        action: "Move to 'Submitted' Column",
        target: "Kanban Drag Action",
        plainExplanation: "User finishes submitting on the official platform and moves their card to 'Submitted' with confirmation details.",
        stateVariant: "default",
        marker: { x: 0.55, y: 0.5, label: "Move to 'Submitted'" }
      },
      {
        step: 5,
        nodeId: "tracker-submission-detail",
        action: "Monitor Review Milestones",
        target: "Timeline progress track",
        plainExplanation: "Success Point! Creator sees live status milestones ('Received' -> 'Assigned to Readers' -> 'Under Review').",
        stateVariant: "under-review",
        marker: { x: 0.5, y: 0.65, label: "Success: Real-time tracking" }
      }
    ]
  },
  {
    id: "journey-03-org-call-creation",
    title: "Journey 3: Organization Launches Open Call & Rubric",
    persona: "Publisher / Editorial Team",
    summary: "Journal editor sets up an open call, configures blind intake requirements and evaluation rubrics, and publishes it live to the world.",
    entryPoint: "Publisher Landing (/for-organizations)",
    successPoint: "Call published live, indexed in discovery feed, and ready for applicant packages",
    steps: [
      {
        step: 1,
        nodeId: "for-organizations",
        action: "Publisher Landing & Sign In",
        target: "Get Started / Log In",
        plainExplanation: "Magazine editor enters Missa's publisher portal to manage their annual contest.",
        stateVariant: "default",
        marker: { x: 0.5, y: 0.6, label: "Click 'Create Call'" }
      },
      {
        step: 2,
        nodeId: "org-overview",
        action: "Open Workspace Dashboard",
        target: "'New Open Call' Button",
        plainExplanation: "Editor lands in the organization workspace and clicks to create a new program.",
        stateVariant: "default",
        marker: { x: 0.8, y: 0.25, label: "Click 'New Call'" }
      },
      {
        step: 3,
        nodeId: "org-opportunities",
        action: "Build Intake Form & Scoring Rubric",
        target: "Form builder & Rubric sliders",
        plainExplanation: "Editor defines rules: Blind PDF required, max 5 pages, 3 evaluation criteria (Voice, Originality, Structure).",
        stateVariant: "builder",
        marker: { x: 0.5, y: 0.5, label: "Configure & Save" }
      },
      {
        step: 4,
        nodeId: "org-opportunities",
        action: "Publish Live to Radar Feed",
        target: "Publish Button",
        plainExplanation: "Success Point! Call goes live. Missa assigns it a public URL, QR code, and indexes it into the global discovery feed.",
        stateVariant: "live",
        marker: { x: 0.85, y: 0.2, label: "Success: Published live!" }
      }
    ]
  },
  {
    id: "journey-04-reviewer-blind-evaluation",
    title: "Journey 4: Reader Conducts Blind Manuscript Review",
    persona: "Guest Judge / Reader",
    summary: "Guest judge receives an email invitation, reads anonymized manuscripts in blind review mode, and scores criteria using the custom rubric.",
    entryPoint: "Email Invitation Link (/reviews?invite=token)",
    successPoint: "Scored evaluation submitted, advancing manuscript to editorial final round",
    steps: [
      {
        step: 1,
        nodeId: "reviewer-assignments",
        action: "Open Assigned Review Queue",
        target: "Batch List with Due Dates",
        plainExplanation: "Judge clicks magic invite link and sees 12 manuscripts assigned to their reading batch.",
        stateVariant: "default",
        marker: { x: 0.5, y: 0.4, label: "Select Entry #1" }
      },
      {
        step: 2,
        nodeId: "reviewer-workstation",
        action: "Read Anonymized Manuscript",
        target: "Split-screen PDF reader",
        plainExplanation: "Judge reads the submission in blind mode (author name and personal bio are completely masked).",
        stateVariant: "default",
        marker: { x: 0.3, y: 0.5, label: "Read Manuscript" }
      },
      {
        step: 3,
        nodeId: "reviewer-workstation",
        action: "Score Rubric & Add Private Notes",
        target: "Criterion Sliders & Note Field",
        plainExplanation: "Judge awards scores: Voice (5/5), Craft (4/5), Resonance (5/5) and writes internal notes for the editor.",
        stateVariant: "default",
        marker: { x: 0.75, y: 0.6, label: "Score & Recommend" }
      },
      {
        step: 4,
        nodeId: "reviewer-workstation",
        action: "Submit Evaluation & Advance Queue",
        target: "Submit Evaluation Button",
        plainExplanation: "Success Point! Scorecard is recorded. The manuscript composite score updates and reader advances to next entry.",
        stateVariant: "submitted",
        marker: { x: 0.85, y: 0.85, label: "Success: Review Saved" }
      }
    ]
  },
  {
    id: "journey-05-decision-to-delivery",
    title: "Journey 5: Editorial Batch Decisions & Contributor Delivery",
    persona: "Lead Editor / Operations",
    summary: "Editor reviews top-scored submissions, issues bulk acceptance letters via Outcome Desk, and initiates publishing fulfillment contracts.",
    entryPoint: "Workspace Submissions (/organization/[id]/submissions)",
    successPoint: "Acceptance notifications delivered and contracts sent for contributor signing",
    steps: [
      {
        step: 1,
        nodeId: "org-submissions",
        action: "Filter by Highest Composite Score",
        target: "Score Filter >= 4.5/5.0",
        plainExplanation: "Lead editor views ranked submissions after all readers finish evaluations and selects the top 5 finalists.",
        stateVariant: "filtered-top",
        marker: { x: 0.5, y: 0.35, label: "Select Top 5" }
      },
      {
        step: 2,
        nodeId: "org-decisions",
        action: "Prepare Batch Acceptance Letters",
        target: "Template Editor & Contract Options",
        plainExplanation: "Editor loads the Outcome Desk, customizes the congratulatory message, and attaches publication agreements.",
        stateVariant: "batch-selected",
        marker: { x: 0.6, y: 0.5, label: "Personalize Letter" }
      },
      {
        step: 3,
        nodeId: "org-decisions",
        action: "Dispatch Batch Notifications",
        target: "Dispatch All Decisions Button",
        plainExplanation: "Missa sends signed decision emails to all applicants simultaneously.",
        stateVariant: "dispatched",
        marker: { x: 0.8, y: 0.75, label: "Click 'Dispatch'" }
      },
      {
        step: 4,
        nodeId: "org-delivery",
        action: "Monitor Fulfillment & Contracts",
        target: "Contract tracker table",
        plainExplanation: "Success Point! System transitions accepted winners into the Delivery Desk to track signed contracts and disbursement.",
        stateVariant: "pending-contracts",
        marker: { x: 0.5, y: 0.5, label: "Success: Delivery active" }
      }
    ]
  },
  {
    id: "journey-06-radar-curation",
    title: "Journey 6: Radar Agent Discovery to Verified Publication",
    persona: "Platform Curator / Engine",
    summary: "Automated Radar web crawler discovers new grant call, extracts dates/fees, and flags for curator verification before live catalog publication.",
    entryPoint: "Automated Web Ingestion Feed",
    successPoint: "Verified opportunity published to public discovery catalog with verified badge",
    steps: [
      {
        step: 1,
        nodeId: "admin-control",
        action: "Crawler Alerts Ingestion Queue",
        target: "Radar Health Metric",
        plainExplanation: "Radar crawler extracts a new call from a literary arts council website and stages it.",
        stateVariant: "default",
        marker: { x: 0.4, y: 0.3, label: "New Source Detected" }
      },
      {
        step: 2,
        nodeId: "admin-radar",
        action: "Curator Inspects Extracted Facts",
        target: "Side-by-side fact verification",
        plainExplanation: "Platform curator reviews extracted deadline, eligibility rules, and confirms no-fee status against official source.",
        stateVariant: "review-queue",
        marker: { x: 0.5, y: 0.5, label: "Verify Fact Consistency" }
      },
      {
        step: 3,
        nodeId: "admin-radar",
        action: "Approve & Publish to Global Catalog",
        target: "Approve & Index Button",
        plainExplanation: "Success Point! Curator approves the call, generating SEO structured data and making it instantly searchable.",
        stateVariant: "default",
        marker: { x: 0.8, y: 0.6, label: "Success: Live in Catalog" }
      }
    ]
  }
];

// --------------------------------------------------------------------------
// 3. EDGE CASES & ERROR BOUNDARIES MATRIX
// --------------------------------------------------------------------------
const EDGE_CASES = [
  {
    id: "ec-conflicting-deadline",
    title: "Contradictory / Conflicting Deadlines",
    nodeId: "opportunity-detail",
    trigger: "Crawler finds different closing dates on guidelines PDF vs website homepage",
    userImpact: "High (risk of missing cutoff if uninformed)",
    systemBehavior: "Missa marks deadline.kind = 'conflicting' and displays an ochre warning banner stating 'The deadline needs confirmation. Confirm on official page before preparing work.'",
    resolution: "User clicks official source button to verify directly with publisher."
  },
  {
    id: "ec-closed-opportunity",
    title: "Expired / Closed Opportunity",
    nodeId: "opportunity-detail",
    trigger: "User clicks shared social link for a grant whose deadline passed yesterday",
    userImpact: "Low (avoids wasted applicant effort)",
    systemBehavior: "Hero replaces 'Save to Tracker' with neutral notice: 'This opportunity is closed. Record remains for reference.'",
    resolution: "User is offered an option to 'Follow Organization' for future call announcements."
  },
  {
    id: "ec-unauthenticated-save",
    title: "Unauthenticated Save Intent",
    nodeId: "login",
    trigger: "Logged-out visitor clicks 'Save to Tracker' on an opportunity",
    userImpact: "Zero friction (no lost user intent)",
    systemBehavior: "Redirects to /login?next=/opportunities/[slug]&intent=save:[id]. Once magic link is verified, system auto-saves call to Tracker immediately.",
    resolution: "Seamless login with zero lost clicks."
  },
  {
    id: "ec-missing-requirements",
    title: "Incomplete / Unlisted Requirements",
    nodeId: "opportunity-detail",
    trigger: "Publisher website does not list explicit fee or required file formats",
    userImpact: "Medium (requires caution)",
    systemBehavior: "Missa displays a transparency notice: 'Some application details are not listed. Use official source to confirm complete file requirements.'",
    resolution: "Curator flags source for manual enrichment."
  },
  {
    id: "ec-unauthorized-admin",
    title: "Unauthorized RBAC Route Access",
    nodeId: "admin-control",
    trigger: "Regular creator account attempts to navigate to /admin or /organization/secret-org",
    userImpact: "Security protection",
    systemBehavior: "Auth guard fails closed: Returns HTTP 403 Forbidden with clear message and safe link back to /home.",
    resolution: "User is safely redirected back to their personal creator dashboard."
  },
  {
    id: "ec-empty-tracker",
    title: "Empty Tracker State",
    nodeId: "tracker",
    trigger: "New creator visits /tracker before bookmarking any opportunities",
    userImpact: "Onboarding encouragement",
    systemBehavior: "Displays a warm empty-state illustration with an onboarding checklist and a 'Browse Opportunities' quick button.",
    resolution: "User clicks button and saves their first grant."
  }
];

// Helper to render node cards for static HTML embedding
function renderAllNodeCards(group) {
  return NODES.filter(n => n.group === group).map(node => {
    const isSuccess = node.successPoint ? 'success-node' : '';
    const isEntry = node.entryPoint ? 'entry-node' : '';
    const isAuth = node.status === 'auth-wall' ? 'auth-node' : '';

    return `
      <div class="screen-card ${isSuccess} ${isEntry} ${isAuth}" id="node-${node.id}" onclick="inspectNode('${node.id}')">
        <div class="card-top">
          <span class="route-pill">${node.route}</span>
          ${node.successPoint ? '<span class="mini-badge" style="background:#eef6e8; color:#4e6d2e;">Point Z</span>' : ''}
          ${node.entryPoint ? '<span class="mini-badge" style="background:#eaf1f5; color:#365b6d;">Entry Point</span>' : ''}
        </div>
        <h3 class="card-title">${node.title}</h3>
        <p class="card-desc">${node.plainExplanation}</p>

        <div class="mini-ui">
          <div class="mini-ui-header">
            <span>${node.title.split('/')[0].trim()}</span>
            ${node.status === 'auth-wall' ? '<span class="mini-badge" style="background:#fdf2e9; color:#a05d20;">Magic Link</span>' : '<span class="mini-badge">Live</span>'}
          </div>
          <div style="color:var(--ink-muted); font-size:10px;">Primary: ${node.primaryActions[0] || 'View'}</div>
          <button class="mini-btn" onclick="event.stopPropagation(); inspectNode('${node.id}')">Inspect Screen</button>
        </div>

        <div class="card-footer">
          <span>${node.category}</span>
          <span>${node.states.length} state${node.states.length > 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 4. GENERATE STANDALONE INTERACTIVE VISUALIZER HTML APP
// --------------------------------------------------------------------------
function generateVisualizerHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Missa — End-to-End User Flow & Navigation Map</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f7f6f4;
      --surface: #ffffff;
      --surface-subtle: #fbfbfa;
      --ink: #171418;
      --ink-secondary: #45413d;
      --ink-muted: #74716d;
      --border: #e7e5e1;
      --border-strong: #d4d0c9;
      --primary: #5a3f68; /* Missa Aubergine */
      --primary-hover: #473050;
      --primary-subtle: #f3eff5;
      --success: #556c3a; /* Missa Lichen */
      --success-subtle: #f0f4eb;
      --warning: #9e6d24; /* Missa Ochre */
      --warning-subtle: #faf4e8;
      --destructive: #b3261e;
      --destructive-subtle: #fceceb;
      --info: #3d6372;
      --info-subtle: #edf4f7;
      --shadow-sm: 0 1px 3px rgba(23, 20, 24, 0.05);
      --shadow-md: 0 8px 24px rgba(23, 20, 24, 0.08);
      --shadow-lg: 0 16px 48px rgba(23, 20, 24, 0.12);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 16px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--ink);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Header Bar */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 50;
      flex-shrink: 0;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-badge {
      font-family: 'Playfair Display', serif;
      font-weight: 600;
      font-size: 20px;
      letter-spacing: -0.5px;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-badge span {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: var(--primary-subtle);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 99px;
    }

    .header-nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tab-btn {
      background: none;
      border: 1px solid transparent;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ink-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
    }
    .tab-btn:hover { background: var(--bg); color: var(--ink); }
    .tab-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    /* Main Workspace Layout */
    .app-body {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
    }

    /* Left Control Sidebar */
    .sidebar {
      width: 380px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      z-index: 40;
      flex-shrink: 0;
      box-shadow: var(--shadow-sm);
    }

    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-header h2 {
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 4px;
    }
    .sidebar-header p {
      font-size: 12px;
      color: var(--ink-muted);
      line-height: 1.4;
    }

    .journey-selector {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-subtle);
    }
    .journey-selector select {
      width: 100%;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-strong);
      background: white;
      font-size: 13px;
      font-weight: 500;
      color: var(--ink);
      cursor: pointer;
      outline: none;
    }

    .flow-player-bar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .player-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-ctrl {
      background: var(--surface);
      border: 1px solid var(--border-strong);
      color: var(--ink);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-ctrl:hover { background: var(--bg); }
    .btn-ctrl.primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .btn-ctrl.primary:hover { background: var(--primary-hover); }

    .step-indicator {
      font-size: 12px;
      font-weight: 600;
      color: var(--primary);
    }

    .step-details-container {
      flex: 1;
      overflow-y: auto;
      padding: 18px 20px;
    }

    .step-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: var(--shadow-sm);
      border-left: 4px solid var(--primary);
    }
    .step-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary);
      margin-bottom: 6px;
    }
    .step-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .step-desc {
      font-size: 13px;
      color: var(--ink-secondary);
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .meta-box {
      background: var(--bg);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      font-size: 12px;
      margin-top: 8px;
    }
    .meta-box strong { color: var(--ink); display: block; margin-bottom: 3px; }
    .meta-box p { color: var(--ink-muted); margin: 0; }

    /* Canvas Map Area */
    .canvas-container {
      flex: 1;
      position: relative;
      overflow: auto;
      background: radial-gradient(#dcd8cf 1px, transparent 1px);
      background-size: 24px 24px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 60px 40px;
    }

    .map-graph {
      display: flex;
      flex-direction: column;
      gap: 64px;
      max-width: 1300px;
      width: 100%;
      position: relative;
    }

    .subsystem-row {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }
    .subsystem-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .subsystem-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .subsystem-tag {
      font-size: 11px;
      background: var(--primary-subtle);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 99px;
      font-weight: 600;
    }

    .node-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
    }

    /* Screen Cards */
    .screen-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .screen-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary);
    }
    .screen-card.active-step {
      border: 2px solid var(--primary);
      box-shadow: 0 0 0 4px rgba(90, 63, 104, 0.18), var(--shadow-lg);
      transform: scale(1.02);
      z-index: 10;
    }
    .screen-card.success-node {
      border-top: 4px solid var(--success);
    }
    .screen-card.entry-node {
      border-top: 4px solid var(--info);
    }
    .screen-card.auth-node {
      border-top: 4px solid var(--warning);
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .route-pill {
      font-family: monospace;
      font-size: 11px;
      background: var(--bg);
      color: var(--ink-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 12px;
      color: var(--ink-muted);
      line-height: 1.4;
      margin-bottom: 12px;
    }

    /* Card Mini UI Mockup */
    .mini-ui {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .mini-ui-header {
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mini-badge {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--success-subtle);
      color: var(--success);
      font-weight: 700;
    }
    .mini-btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      margin-top: 4px;
      display: inline-block;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--ink-muted);
      border-top: 1px solid var(--border);
      padding-top: 8px;
      margin-top: auto;
    }

    /* Target Pulse Animation on Active Step */
    .pulse-target {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      background: var(--primary);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 0 0 0 rgba(90, 63, 104, 0.7);
      animation: pulse 1.5s infinite;
      z-index: 20;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(90, 63, 104, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(90, 63, 104, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(90, 63, 104, 0); }
    }

    /* Drawer Inspector / Modal View */
    .inspector-modal {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 420px;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 20px;
      z-index: 100;
      display: none;
    }
    .inspector-modal.open { display: block; }
    .modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: var(--ink-muted);
    }

    /* Edge Cases Table Tab */
    .edge-cases-view, .entry-points-view {
      display: none;
      padding: 30px;
      max-width: 1200px;
      margin: 0 auto;
      overflow-y: auto;
      height: 100%;
    }
    .edge-cases-view.active, .entry-points-view.active { display: block; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
    }
    .data-table th, .data-table td {
      padding: 14px 18px;
      text-align: left;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
    }
    .data-table th {
      background: var(--surface-subtle);
      font-weight: 600;
      color: var(--ink);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table tr:hover { background: var(--bg); }
    .badge-pill {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 99px;
      font-weight: 600;
    }
    .badge-warning { background: var(--warning-subtle); color: var(--warning); }
    .badge-info { background: var(--info-subtle); color: var(--info); }
    .badge-success { background: var(--success-subtle); color: var(--success); }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="brand-group">
      <div class="brand-badge">
        Missa <span>User Flow Visualizer</span>
      </div>
    </div>
    <div class="header-nav">
      <button class="tab-btn active" onclick="switchView('interactive-map')">🗺️ Interactive Visual Map</button>
      <button class="tab-btn" onclick="switchView('entry-points')">🚪 All Entry Points</button>
      <button class="tab-btn" onclick="switchView('edge-cases')">⚠️ Edge Cases & Safety Rails</button>
    </div>
  </header>

  <!-- Body Content -->
  <div class="app-body">
    
    <!-- Left Guided Flow Sidebar -->
    <aside class="sidebar" id="flow-sidebar">
      <div class="sidebar-header">
        <h2>Guided Flow Replayer</h2>
        <p>Choose a user journey below to step through Point A to Point Z with live highlights and non-technical explanations.</p>
      </div>

      <div class="journey-selector">
        <select id="journey-select" onchange="loadJourney(this.value)">
          ${JOURNEYS.map((j, i) => `<option value="${j.id}">${j.title}</option>`).join('')}
        </select>
      </div>

      <div class="flow-player-bar">
        <div class="step-indicator" id="step-counter">Step 1 of 6</div>
        <div class="player-controls">
          <button class="btn-ctrl" onclick="prevStep()">◀ Back</button>
          <button class="btn-ctrl primary" onclick="nextStep()">Next Step ▶</button>
          <button class="btn-ctrl" id="autoplay-btn" onclick="toggleAutoPlay()">▶ Auto Play</button>
        </div>
      </div>

      <div class="step-details-container" id="step-details">
        <!-- Dynamically populated -->
      </div>
    </aside>

    <!-- Canvas Navigation Map -->
    <main class="canvas-container" id="canvas-view">
      <div class="map-graph">

        <!-- Subsystem 1 -->
        <section class="subsystem-row" id="subsystem-public">
          <div class="subsystem-header">
            <div class="subsystem-title">🌐 1. Public Discovery & Onboarding</div>
            <div class="subsystem-tag">Entry Points & Search</div>
          </div>
          <div class="node-grid">
            ${renderAllNodeCards('public')}
          </div>
        </section>

        <!-- Subsystem 2 -->
        <section class="subsystem-row" id="subsystem-passport">
          <div class="subsystem-header">
            <div class="subsystem-title">🪪 2. Creator Passport (Submitter Workspace)</div>
            <div class="subsystem-tag">Tracker, Library & Decisions</div>
          </div>
          <div class="node-grid">
            ${renderAllNodeCards('passport')}
          </div>
        </section>

        <!-- Subsystem 3 -->
        <section class="subsystem-row" id="subsystem-workspace">
          <div class="subsystem-header">
            <div class="subsystem-title">🏢 3. Organization Workspace</div>
            <div class="subsystem-tag">Calls, Submissions & Outcome Desk</div>
          </div>
          <div class="node-grid">
            ${renderAllNodeCards('workspace')}
          </div>
        </section>

        <!-- Subsystem 4 -->
        <section class="subsystem-row" id="subsystem-reviewer">
          <div class="subsystem-header">
            <div class="subsystem-title">⚖️ 4. Reviewer Workstation</div>
            <div class="subsystem-tag">Blind Rubric & Scoring</div>
          </div>
          <div class="node-grid">
            ${renderAllNodeCards('reviewer')}
          </div>
        </section>

        <!-- Subsystem 5 -->
        <section class="subsystem-row" id="subsystem-admin">
          <div class="subsystem-header">
            <div class="subsystem-title">🛡️ 5. Platform Admin & Radar Engine</div>
            <div class="subsystem-tag">Crawler Ingestion & Health</div>
          </div>
          <div class="node-grid">
            ${renderAllNodeCards('admin')}
          </div>
        </section>

      </div>
    </main>

    <!-- Entry Points View -->
    <div class="entry-points-view" id="entry-points-view">
      <h2 style="font-size:22px; font-weight:700; margin-bottom:8px;">All Application Entry Points (Point A)</h2>
      <p style="color:var(--ink-secondary); margin-bottom:24px;">Every channel and link format through which users first arrive at Missa.</p>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Entry Channel</th>
            <th>Landing Route</th>
            <th>Sample Link / Intent</th>
            <th>Target User Persona</th>
            <th>Initial Success Goal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Direct Search & SEO</strong></td>
            <td><code>/</code> & <code>/opportunities</code></td>
            <td><code>https://missa.app/opportunities</code></td>
            <td><span class="badge-pill badge-info">Submitters</span></td>
            <td>Find verified calls matching practice/genre</td>
          </tr>
          <tr>
            <td><strong>Shared Opportunity Link</strong></td>
            <td><code>/opportunities/[id]</code></td>
            <td><code>https://missa.app/opportunities/arole-poetry-2026</code></td>
            <td><span class="badge-pill badge-info">Submitters</span></td>
            <td>Check eligibility, fee status, and save to Tracker</td>
          </tr>
          <tr>
            <td><strong>Magic Link Auth Email</strong></td>
            <td><code>/login</code></td>
            <td><code>/login?token=xyz&next=/tracker&intent=save:42</code></td>
            <td><span class="badge-pill badge-info">All Users</span></td>
            <td>Passwordless sign-in with preserved save intent</td>
          </tr>
          <tr>
            <td><strong>Reviewer Invitation</strong></td>
            <td><code>/reviews</code></td>
            <td><code>https://missa.app/reviews?invite=token-987</code></td>
            <td><span class="badge-pill badge-warning">Guest Judges</span></td>
            <td>Access assigned batch for blind evaluation</td>
          </tr>
          <tr>
            <td><strong>Publisher Partnership</strong></td>
            <td><code>/for-organizations</code></td>
            <td><code>https://missa.app/for-organizations</code></td>
            <td><span class="badge-pill badge-success">Publishers</span></td>
            <td>Create organization account and launch open calls</td>
          </tr>
          <tr>
            <td><strong>Decision Status Notification</strong></td>
            <td><code>/tracker/submissions/[id]</code></td>
            <td><code>/tracker/submissions/sub_102</code></td>
            <td><span class="badge-pill badge-info">Submitters</span></td>
            <td>Read acceptance letter and sign contributor contract</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edge Cases View -->
    <div class="edge-cases-view" id="edge-cases-view">
      <h2 style="font-size:22px; font-weight:700; margin-bottom:8px;">Edge Cases, Warnings & Safety Rails</h2>
      <p style="color:var(--ink-secondary); margin-bottom:24px;">How Missa proactively protects users from conflicting dates, expired calls, and authorization failures.</p>

      <table class="data-table">
        <thead>
          <tr>
            <th>Scenario / Trigger</th>
            <th>Impact</th>
            <th>System Behavior & User Notice</th>
            <th>Resolution Path</th>
          </tr>
        </thead>
        <tbody>
          ${EDGE_CASES.map(ec => `
            <tr>
              <td><strong>${ec.title}</strong><br><span style="font-size:11px; color:var(--ink-muted);">${ec.trigger}</span></td>
              <td><span class="badge-pill ${ec.userImpact.includes('High') ? 'badge-warning' : 'badge-info'}">${ec.userImpact}</span></td>
              <td>${ec.systemBehavior}</td>
              <td><span style="font-weight:500; color:var(--primary);">${ec.resolution}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

  </div>

  <!-- Inspector Modal -->
  <div class="inspector-modal" id="inspector-modal">
    <button class="modal-close" onclick="closeInspector()">×</button>
    <div id="inspector-content"></div>
  </div>

  <script>
    const JOURNEYS_DATA = ${JSON.stringify(JOURNEYS)};
    const NODES_DATA = ${JSON.stringify(NODES)};

    let currentJourneyIndex = 0;
    let currentStepIndex = 0;
    let autoPlayTimer = null;

    function init() {
      loadJourney(JOURNEYS_DATA[0].id);
    }

    function switchView(view) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(view)) btn.classList.add('active');
      });

      const canvas = document.getElementById('canvas-view');
      const sidebar = document.getElementById('flow-sidebar');
      const entryView = document.getElementById('entry-points-view');
      const edgeView = document.getElementById('edge-cases-view');

      canvas.style.display = view === 'interactive-map' ? 'flex' : 'none';
      sidebar.style.display = view === 'interactive-map' ? 'flex' : 'none';
      entryView.classList.toggle('active', view === 'entry-points');
      edgeView.classList.toggle('active', view === 'edge-cases');
    }

    function loadJourney(journeyId) {
      currentJourneyIndex = JOURNEYS_DATA.findIndex(j => j.id === journeyId);
      currentStepIndex = 0;
      stopAutoPlay();
      updateStepDisplay();
    }

    function updateStepDisplay() {
      const journey = JOURNEYS_DATA[currentJourneyIndex];
      const step = journey.steps[currentStepIndex];

      document.getElementById('step-counter').innerText = 'Step ' + (currentStepIndex + 1) + ' of ' + journey.steps.length;

      // Update sidebar details
      const container = document.getElementById('step-details');
      container.innerHTML = \`
        <div class="step-card">
          <span class="step-badge">Step \${step.step} · \${journey.persona}</span>
          <h3 class="step-title">\${step.action}</h3>
          <p class="step-desc">\${step.plainExplanation}</p>
          <div class="meta-box">
            <strong>🎯 Target Action:</strong>
            <p>\${step.target}</p>
          </div>
          <div class="meta-box" style="margin-top:6px;">
            <strong>🏁 Journey Milestone:</strong>
            <p>\${currentStepIndex === journey.steps.length - 1 ? '🎉 Point Z (Success Reached!)' : 'Moving to next phase'}</p>
          </div>
        </div>
      \`;

      // Highlight active node on canvas
      document.querySelectorAll('.screen-card').forEach(card => {
        card.classList.remove('active-step');
        const pulse = card.querySelector('.pulse-target');
        if (pulse) pulse.remove();
      });

      const activeCard = document.getElementById('node-' + step.nodeId);
      if (activeCard) {
        activeCard.classList.add('active-step');
        
        // Add animated pulse target
        const pulse = document.createElement('div');
        pulse.className = 'pulse-target';
        pulse.innerText = step.step;
        activeCard.appendChild(pulse);

        // Smooth scroll canvas to active node
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }

    function nextStep() {
      const journey = JOURNEYS_DATA[currentJourneyIndex];
      if (currentStepIndex < journey.steps.length - 1) {
        currentStepIndex++;
        updateStepDisplay();
      } else {
        stopAutoPlay();
      }
    }

    function prevStep() {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        updateStepDisplay();
      }
    }

    function toggleAutoPlay() {
      if (autoPlayTimer) {
        stopAutoPlay();
      } else {
        document.getElementById('autoplay-btn').innerText = '⏸ Pause';
        document.getElementById('autoplay-btn').classList.add('primary');
        autoPlayTimer = setInterval(() => {
          const journey = JOURNEYS_DATA[currentJourneyIndex];
          if (currentStepIndex < journey.steps.length - 1) {
            nextStep();
          } else {
            currentStepIndex = 0;
            updateStepDisplay();
          }
        }, 3200);
      }
    }

    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
        document.getElementById('autoplay-btn').innerText = '▶ Auto Play';
        document.getElementById('autoplay-btn').classList.remove('primary');
      }
    }

    function inspectNode(nodeId) {
      const node = NODES_DATA.find(n => n.id === nodeId);
      if (!node) return;
      const modal = document.getElementById('inspector-modal');
      const content = document.getElementById('inspector-content');

      content.innerHTML = \`
        <span class="route-pill" style="margin-bottom:8px; display:inline-block;">\${node.route}</span>
        <h3 style="font-size:17px; font-weight:700; margin-bottom:6px;">\${node.title}</h3>
        <p style="font-size:13px; color:var(--ink-secondary); margin-bottom:14px;">\${node.plainExplanation}</p>
        
        <div class="meta-box" style="margin-bottom:8px;">
          <strong>🎯 Primary User Actions:</strong>
          <ul style="padding-left:18px; margin-top:4px;">
            \${node.primaryActions.map(a => \`<li>\${a}</li>\`).join('')}
          </ul>
        </div>

        <div class="meta-box">
          <strong>⚡ State Variants:</strong>
          <ul style="padding-left:18px; margin-top:4px;">
            \${node.states.map(s => \`<li><strong>\${s.name}:</strong> \${s.note}</li>\`).join('')}
          </ul>
        </div>
      \`;

      modal.classList.add('open');
    }

    function closeInspector() {
      document.getElementById('inspector-modal').classList.remove('open');
    }

    window.onload = init;
  </script>
</body>
</html>
`;
}

// --------------------------------------------------------------------------
// 5. WRITE .EXPO-MAP / APPMAP SPECIFICATION FILES
// --------------------------------------------------------------------------

// 5.1 manifest.json
const manifest = {
  formatVersion: 2,
  flowFormat: "argent",
  generator: "expo-map/2.0",
  app: {
    name: "usemissa",
    title: "Missa — Opportunity Discovery & Submission Platform",
    scheme: "missa",
    platform: "web-nextjs",
    device: "Desktop & Responsive Mobile Web",
    mode: "next-app-router"
  },
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(EXPO_MAP_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 5.2 map.json & graph.json
const mapData = {
  formatVersion: 2,
  nodes: NODES.map(n => ({
    id: n.id,
    urlPath: n.route,
    title: n.title,
    group: n.group,
    category: n.category,
    persona: n.persona,
    entryPoint: n.entryPoint,
    successPoint: n.successPoint,
    status: n.status,
    presentation: "page",
    stateHints: n.states.map(s => ({ id: s.id, name: s.name, note: s.note }))
  })),
  edges: [
    { from: "home", to: "opportunities-list", trigger: "search_or_filter", label: "Browse Catalog" },
    { from: "opportunities-list", to: "opportunity-detail", trigger: "select_call", label: "Inspect Facts" },
    { from: "opportunity-detail", to: "login", trigger: "save_intent", label: "Sign in to Save (Intent preserved)", conditional: true },
    { from: "login", to: "tracker", trigger: "auth_success", label: "Auto-Saved to Tracker" },
    { from: "tracker", to: "tracker-submission-detail", trigger: "open_submission", label: "View Status Timeline" },
    { from: "passport-home", to: "library", trigger: "manage_work", label: "Upload Manuscripts" },
    { from: "for-organizations", to: "org-overview", trigger: "org_login", label: "Open Workspace" },
    { from: "org-overview", to: "org-opportunities", trigger: "create_call", label: "Build Open Call" },
    { from: "org-overview", to: "org-submissions", trigger: "view_queue", label: "Submissions Table" },
    { from: "org-submissions", to: "org-decisions", trigger: "batch_decision", label: "Outcome Desk" },
    { from: "org-decisions", to: "org-delivery", trigger: "dispatch_success", label: "Publishing Contracts" },
    { from: "reviewer-assignments", to: "reviewer-workstation", trigger: "select_entry", label: "Blind Scoring Rubric" },
    { from: "admin-control", to: "admin-radar", trigger: "inspect_sources", label: "Curate Ingested Calls" }
  ]
};
fs.writeFileSync(path.join(EXPO_MAP_DIR, 'map.json'), JSON.stringify(mapData, null, 2));
fs.writeFileSync(path.join(EXPO_MAP_DIR, 'graph.json'), JSON.stringify({ routes: mapData.nodes, edges: mapData.edges }, null, 2));

// 5.3 capture-status.json
const captureStatus = {};
for (const n of NODES) {
  captureStatus[n.id] = {
    status: n.status,
    note: n.plainExplanation,
    entryPoint: n.entryPoint,
    successPoint: n.successPoint
  };
}
fs.writeFileSync(path.join(EXPO_MAP_DIR, 'capture-status.json'), JSON.stringify(captureStatus, null, 2));

// 5.4 Write all 6 Argent YAML flows + Sidecars (.meta.json)
for (const j of JOURNEYS) {
  // Argent YAML flow
  const yamlContent = `# ${j.title}
# Persona: ${j.persona}
# Point A: ${j.entryPoint}
# Point Z: ${j.successPoint}

steps:
${j.steps.map((s, idx) => `  - tool: navigate
    args:
      route: "${NODES.find(n => n.id === s.nodeId)?.route || s.nodeId}"
      action: "${s.action}"
  - wait: 1200
  - tap: { x: ${s.marker.x}, y: ${s.marker.y} }
`).join('')}
`;
  fs.writeFileSync(path.join(FLOWS_DIR, `${j.id}.yaml`), yamlContent);

  // Sidecar JSON (.meta.json)
  const metaContent = {
    formatVersion: 2,
    name: j.id,
    title: j.title,
    persona: j.persona,
    entryPoint: j.entryPoint,
    successPoint: j.successPoint,
    summary: j.summary,
    steps: {}
  };
  j.steps.forEach((s, idx) => {
    metaContent.steps[String(idx * 3)] = {
      screen: s.nodeId,
      target: s.target,
      note: s.plainExplanation
    };
  });
  fs.writeFileSync(path.join(FLOWS_DIR, `${j.id}.meta.json`), JSON.stringify(metaContent, null, 2));
}

// 5.5 Write Standalone Interactive HTML Visualizer
const htmlOutput = generateVisualizerHtml();
fs.writeFileSync(path.join(OUTPUTS_DIR, 'missa-flow-map.html'), htmlOutput);
fs.writeFileSync(path.join(EXPO_MAP_DIR, 'visualizer.html'), htmlOutput);

// 5.6 Create .appmap Zip Bundle using system zip if available
try {
  const appmapZipPath = path.join(EXPO_MAP_DIR, 'missa.appmap');
  if (fs.existsSync(appmapZipPath)) fs.unlinkSync(appmapZipPath);
  execFileSync('zip', ['-r', '-q', appmapZipPath, 'manifest.json', 'map.json', 'flows'], { cwd: EXPO_MAP_DIR });
  console.log(`[OK] Created .appmap bundle at: ${appmapZipPath}`);
} catch (e) {
  console.log('[NOTE] Zip bundle skipped or created manually:', e.message);
}

console.log('[SUCCESS] Missa User Flow & Navigation Map generated successfully!');
console.log(`- Visualizer Web App: ${path.join(OUTPUTS_DIR, 'missa-flow-map.html')}`);
console.log(`- Appmap Manifest & Graph: ${path.join(EXPO_MAP_DIR, 'map.json')}`);
console.log(`- Flows Directory: ${FLOWS_DIR}`);
