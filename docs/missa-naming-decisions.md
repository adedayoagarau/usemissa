# Missa — Naming Decisions

The rename spec. Companion to `missa-naming-inventory.md` (the research inventory).

## The Rule

**Navigation uses the industry's boring nouns. Personality lives in the microcopy.**

Three registers, three jobs:

| Register | Where it lives | Example |
| :-- | :-- | :-- |
| Literary ("The Correspondence," "Sent/Waiting/Answered") | Marketing & landing pages only | Landing page chapters — keep exactly as they are |
| Standard nouns (Opportunities, Submissions, Reviews, Messages, Insights) | App navigation, buttons, statuses | Everything users click |
| Database language (SubmissionPackage, SubmissionPath, Entity, ReviewRound) | Code and schema only — never rendered | Engineers keep these; users never see them |

The brand voice shows up in empty states, notifications, and Props copy — not in labels:

- **Messages**, empty state: *"Every opportunity begins with a conversation."*
- **Pending**, empty state: *"Good work takes time. We'll let you know when something changes."*
- **Saved**, empty state: *"Save the calls you're not ready for yet."*

---

## Submitter Side (Missa Passport)

App navigation: **Home · Opportunities · Tracker · Library · Calendar · Messages · Insights**

| Current | Final | Notes |
| :-- | :-- | :-- |
| Opportunity Inbox | **Home** (feed), with an **Inbox** section | "Inbox" reads as email; the feed is the home surface |
| Missa Discover | **Opportunities** | Matches Submittable/Foundant vocabulary |
| Missa Tracker | **Tracker** | Keep — Duotrope/Chill Subs users already say "tracker" |
| Opportunity Card | **Opportunity** | Nobody names the card |
| Universal Submitter Profile | **My Passport** (marketing) / **Profile** (settings) | |
| Public Submitter Pages | **Public Profile** | |
| Works Library + Portfolio Library + Reusable Answers | **Library** (tabs: Works · Files · Saved Answers) | "Submission Wallet" survives as marketing copy for the Passport bundle, not a nav item |
| Draft Workspace | **Drafts** | |
| Submission Packet | **Submission** | "Packet" allowed in copy for multi-piece sends (poets say packet) |
| Auto Calendar | **Calendar** | Automation is expected, not named |
| Email Reminder Engine | **Reminders** | |
| Notification Digest | **Digest** (a notifications setting) | |
| Gmail Auto-Tracking | **Email Sync** | Modes: **Forwarding address** · **Gmail Sync** · **Autopilot** (full auto-update) |
| Expected Response Window | **Expected Response** | Landing page already uses this label — align app to it |
| Fit Score | **Fit Score** | Keep |
| Eligibility Guardrails / Checker | **Eligibility Check** | |
| Trust Layer / Trust Signals / Freshness | **Verified** (badge) + "checked 4h ago" copy | "Trust Layer" is internal architecture speak |
| Simultaneous Submission Intelligence | *(no feature name)* | It's just the Tracker doing its job; UI shows "Out at 4 places" |
| One-Click Import / Import Existing Tracker | **Import** | |
| Personal Analytics Dashboard / Submitter Analytics | **Insights** | |
| Opportunity Preparation Checklist | **Checklist** | |
| Opportunity Lists and Playlists | **Lists** | |
| Organization Follow System | **Following** | |
| Opportunity Matching / Recommendations | **For You** (feed section) | |
| Props | **Props** | Keep — already the right register |

### Tracker views

| Current | Final |
| :-- | :-- |
| Pipeline View | **Pipeline** |
| Deadline View | **Calendar** |
| Work-Based View | **Works** |
| Opportunity Type View | **Types** |
| Organization View | **Organizations** |
| List View | **List** |

### The word "Submitter"

Never shown to the user about themselves — the UI says **you / your work / My Passport**.
Admin-side, the noun is **configurable per opportunity type** (this falls out of the existing
taxonomy system): default **Submitters**, templates set **Applicants** (grants/fellowships),
**Entrants** (awards), **Writers/Artists/Filmmakers** (creative verticals). One schema word
(`submitter`), many rendered labels.

---

## Organization Side (Missa Workspace)

The eight verb modules become noun navigation:

**Opportunities · Submissions · Reviews · Decisions · Messages · Delivery · Insights · Settings**

| Current module | Final | Notes |
| :-- | :-- | :-- |
| Discover | **Opportunities** | Your listings, pages, and public profile |
| Submit + Manage | **Submissions** | One surface: the inbox IS the manage module |
| Review | **Reviews** | |
| Decide | **Decisions** | |
| Message | **Messages** | |
| Deliver | **Delivery** | Templates may relabel: **Awards** (grants), **Publication** (magazines), **Selections** (festivals) |
| Analyze | **Insights** | |

### Organization features

| Current | Final |
| :-- | :-- |
| Submission Builder | **Form Builder** (the flow is just "Create opportunity") |
| Submission Inbox | **Inbox** (inside Submissions) — keep |
| Smart Statuses | **Statuses** (the automation lives under Automations) |
| Auto-Bucketing | **Routing rules** (under Automations) |
| Rules Engine | **Automations** — industry standard (Apply, Submittable) |
| Reviewer Portal | **Reviewer Portal** — keep, industry standard |
| Setup Wizard / Use-Case Picker | **Getting Started** |
| Template Marketplace | **Templates** (gallery) |
| "Test as Submitter" | **Preview** ("Preview as applicant" in grants templates) |
| Launch Checklist | **Launch Checklist** — keep |
| One-Button Import | **Import** |
| Migration Integrity Report | **Import Report** |
| Claim Discovered Opportunity | **Claim your listing** |
| Auto-Generated Call Preview | *(no name — a Form Builder capability: "Generate from guidelines")* |
| Organization CRM-lite | **People** |

---

## Enterprise Layer

| Current | Final | Notes |
| :-- | :-- | :-- |
| Enterprise Account | **Organization** | The billing/legal top level |
| Entity | **Team** | Default label; enterprise admins can relabel (Departments, Imprints, Chapters). `entity` stays in schema |
| Workspaces/Programs | **Programs** | Drop the inner "Workspace" — collides with the product name |
| Enterprise Admin Console | **Admin** | |
| Entity Management | **Teams** (inside Admin) | |
| Seat Allocation | **Seats** | |
| User Directory | **Members** | |
| White-Labeled Entity Pages | **Branded pages** | |

Hierarchy: **Organization → Teams → Programs → Opportunities → Submissions**

### Roles & seats

| Current | Final |
| :-- | :-- |
| Enterprise Admin | **Owner** / **Admin** |
| Entity Admin | **Team Admin** |
| Program Manager | **Program Manager** — keep |
| Reviewer | **Reviewer** — keep |
| Finance Seat | **Finance** |
| Legal/Compliance Seat | **Legal** |
| Viewer/Read-only Seat | **Viewer** — keep |
| External Collaborator | **Guest** — industry standard |

---

## Core Objects (user-facing vocabulary)

| Current | Final | Notes |
| :-- | :-- | :-- |
| Opportunity / Open Call | **Opportunity** | One word everywhere in-app; "open call" stays available in marketing copy |
| Submission Package | **Submission** | |
| Submission Item | **Work** | "Each work gets its own decision" — the landing page already sells this in exactly these words |
| Submission Path | *(internal only)* | Users see a **form** and **categories**; `submission_path` stays in schema |
| Work | **Work** — keep | |
| Program | **Program** — keep | Plan tier renamed to avoid collision (below) |
| ReviewRound | **Round** (when shown: "Round 2 of 3") | |
| FileAsset | **File** | |
| AuditLog | **Activity log** | |

### Statuses

Keep the existing lifecycle-specific lists — they already match industry vocabulary
(Duotrope: Pending/Accepted/Rejected; Submittable: In Review/Decisions). Two trims:

- "Draft Started" → **Drafting**
- "Ready to Submit" → **Ready**

The emotional handling of Declined/Withdrawn happens in notification copy, not by
renaming the status.

---

## Pricing Plans

| Current | Final | Notes |
| :-- | :-- | :-- |
| Free Organization Profile | **Free** | |
| Indie | **Indie** — keep | |
| Creative Pro | **Pro** | "Creative" excluded grants buyers |
| Program | **Program** | Acceptable collision — buyers running programs expect it |
| Program Pro | **Program Pro** | |
| Enterprise Starter / Enterprise | **Enterprise** (Starter as internal tier) | |
| Founding offers | **Founding Member** pricing — keep | |

---

## Marketing (unchanged)

The landing page keeps its register — it is doing a different job than navigation:

**The Correspondence · Sent · Waiting · Answered · The Promise · "Free for creatives. Forever."**

The bridge between the two registers is microcopy. The app never says "The Correspondence";
the landing page never says "SubmissionPackage." Both say **Missa**.

## Names Retired Entirely

Submission Package · Submission Item · Submission Path · Opportunity Card · Entity (UI) ·
Universal Submitter Profile · Email Reminder Engine · Rules Engine · Trust Layer ·
Simultaneous Submission Intelligence · Auto-Bucketing · Migration Integrity Report ·
Enterprise Admin Console · Personal Analytics Dashboard · Setup Wizard ·
Template Marketplace · Notification Digest (as a name) · "Submitter" (user-facing)
