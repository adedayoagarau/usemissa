# Missa — Complete Naming Inventory

> **Historical record.** This inventory documents the names as they stood *before* the rename.
> The final names are in [`missa-naming-decisions.md`](./missa-naming-decisions.md), and
> `missa-strategy.md` + the landing page have been updated to use them.

Every named part of the Missa web app, pulled from `docs/missa-strategy.md` and `landing/index.html`.
Use this as the worksheet for competitive naming research: for each part, note what competitors
call it, then decide keep / rename.

Legend for the **Feel** column — a first-pass gut check on which names read "robotic":
- 🤖 generic/robotic — sounds like a database table or an enterprise checkbox
- 😐 serviceable — clear but flavorless
- ✨ has character — already differentiated, probably keep

---

## 1. Brand & Product Suite

| Current name | What it is | Feel |
| :-- | :-- | :-- |
| **Missa** | The product brand | ✨ |
| **Missa Passport** | The free submitter product (profile + wallet + tracker + alerts) | ✨ |
| **Missa Workspace** | The paid organization product | 🤖 (Notion/Slack/Google all use "Workspace") |
| **Missa Enterprise** | Multi-entity institution tier | 🤖 |
| **Missa Radar** | Opportunity intelligence / web-monitoring layer | ✨ |
| **Missa Tracker** | The submission tracker (core free feature) | 😐 |
| **Missa Discover** | Public opportunity directory / marketplace | 😐 (Submittable's marketplace is literally called "Discover") |
| **"The Opportunity OS"** | Hero kicker on landing page | 😐 ("...OS" is a startup cliché) |
| **"Missa: The Correspondence"** | Landing page title / narrative concept | ✨ |
| **Missa Platform, Inc.** | Proposed legal entity name | — |

## 2. Submitter Side (free product) — Surfaces & Features

| Current name | What it is | Feel |
| :-- | :-- | :-- |
| **Opportunity Inbox** | Home feed of new/opening/closing/recommended calls | 😐 |
| **Tracker** | Where every submission lives, from "interested" to outcome | 😐 |
| **Opportunity Card** | The main tracker object (one card per opportunity) | 🤖 |
| **Submission Wallet** | Reusable materials: bios, CVs, statements, samples, saved answers | ✨ |
| **Works library** | The user's pieces (poems, stories, films, projects) | 😐 |
| **Universal Submitter Profile** | Name, bio, eligibility, portfolio, publication history | 🤖 |
| **Public Submitter Pages** | Shareable public profile | 🤖 |
| **Portfolio Library** | Stored samples, images, videos, PDFs, manuscripts | 😐 |
| **Reusable Answers** | Saved common answers (bio, artist statement, DEI statement) | 🤖 |
| **Draft Workspace** | Where a submission is prepared before sending | 🤖 |
| **Submission Packet** | A bundle of works sent to one opportunity | 😐 (but "packet" is native vocabulary for poets) |
| **Auto Calendar** / **Free Deadline Calendar** | Deadlines, prep reminders, response windows synced to Google/Apple/Outlook | 🤖 |
| **Email Reminder Engine** | Contextual nudges ("closes in 7 days, you haven't started") | 🤖 ("engine" is internal-speak) |
| **Notification Digest** | Batched updates email | 🤖 |
| **Gmail Auto-Tracking** | Reads reply emails, updates tracker automatically | 😐 (the killer feature — deserves a real name) |
| **Forwarding Address** (Mode 1) | Forward confirmation emails to a missa address | 😐 |
| **Gmail Connect — Conservative** (Mode 2) | Scan only known-sender submission emails | 🤖 |
| **Gmail Connect — Autopilot** (Mode 3) | Full detection of submissions/decisions | ✨ |
| **Expected Response Window** | "You'll probably hear back late March–mid April" prediction | 🤖 (feature is magic, name is a spec sheet) |
| **Fit Score** | How well an opportunity matches the user's work | 😐 |
| **Eligibility Guardrails** / **Eligibility Checker** | Warns before user wastes time on ineligible calls | 🤖 |
| **Trust Layer** / **Trust Signals** | Legitimacy indicators on opportunities (verified, fresh, scam-flagged) | 🤖 |
| **Freshness / Trust Data** | "Verified 2 hours ago" on opportunity cards | 🤖 |
| **Simultaneous Submission Intelligence** | Knows where else a piece is out; flags withdrawals needed | 🤖 |
| **One-Click Import** / **Import Existing Tracker** | Migrate spreadsheet/Duotrope/Chill Subs history | 😐 |
| **Personal Analytics Dashboard** / **Submitter Analytics** | Pipeline, outcomes, response behavior, fees, work performance | 🤖 |
| **Submission History** | Full record of everything ever sent | 😐 |
| **Opportunity Preparation Checklist** | Required materials checklist per call | 🤖 |
| **Opportunity Lists and Playlists** | Curated/shareable lists of calls | 😐 ("playlists" is borrowed from music) |
| **Organization Follow System** | Follow magazines/grantmakers for new-call alerts | 🤖 ("system" leaked from the spec) |
| **Opportunity Matching** / **Personalized Recommendations** | "Calls matching your profile" | 🤖 |
| **Props** | Gamification: encouragement moments (First Submission, Deadline Hero, Resilient…) | ✨ (doc considered: Milestones, Momentum, Wins, Streaks, Signals, Cheers) |

### Tracker views

| Current name | What it shows | Feel |
| :-- | :-- | :-- |
| **Pipeline View** | Kanban board: Interested → Preparing → Submitted → … | 🤖 (sales-CRM word for creative work) |
| **Deadline View** | Calendar/timeline by urgency | 😐 |
| **Work-Based View** | Where each piece is currently out | 🤖 |
| **Opportunity Type View** | Grouped by magazines/grants/awards/… | 🤖 |
| **Organization View** | History per magazine/funder | 🤖 |
| **List View** | Dense spreadsheet mode | 😐 |

## 3. Organization Side (Missa Workspace) — The 8 Modules

The product architecture names its modules with bare verbs — the most robotic layer in the whole app:

| Current name | What it covers | Feel |
| :-- | :-- | :-- |
| **Discover** | Public directory, opportunity pages, org profiles, SEO | 🤖 |
| **Submit** | Submitter profile, drafts, fees, eligibility, dashboard | 🤖 |
| **Manage** | Submission inbox, tags, statuses, assignment, audit | 🤖 |
| **Review** | Reviewer portal, rubrics, blind review, panels, stages | 🤖 |
| **Decide** | Shortlists, accept/decline/waitlist, batches, offers | 🤖 |
| **Message** | Templates, triggers, bulk email, in-app messages | 🤖 |
| **Deliver** | Post-acceptance: files, agreements, payments, publication | 🤖 |
| **Analyze** | Funnel, review/decision analytics, equity reports, exports | 🤖 |

### Organization-side features & surfaces

| Current name | What it is | Feel |
| :-- | :-- | :-- |
| **Submission Builder** / **Form Builder** | Creating calls: fields, conditional logic, fees, caps | 🤖 |
| **Submission Inbox** | All incoming submissions in one table | 😐 |
| **Smart Statuses** | Auto-managed lifecycle statuses | 🤖 |
| **Auto-Bucketing** | Auto-routing submissions by rules | 🤖 |
| **Organization CRM-lite** | Relationship history with submitters | 🤖 |
| **Reviewer Portal** | Reviewers see only what they need | 🤖 |
| **Rules Engine** | Eligibility/routing/caps automation | 🤖 |
| **Setup Wizard** / **Guided Setup Wizard** | No-code call creation flow | 🤖 |
| **Use-Case Picker** | "What are you running?" onboarding step | 🤖 |
| **Template Marketplace** | Prebuilt call templates by vertical | 😐 |
| **"Test as Submitter"** | Preview the call as an applicant | 😐 |
| **Launch Checklist** | Pre-publish readiness check | 😐 |
| **One-Button Import** / **One-Button Data Portability** | Migrate from Submittable/spreadsheets | 😐 |
| **Migration Integrity Report** | Proof that imported data survived intact | 🤖 |
| **Claim Discovered Opportunity** | Org claims a Radar-found listing | 😐 |
| **Auto-Generated Call Preview** | Generate a call page from pasted guidelines | 🤖 |
| **Zero-to-Live Open Call** | Activation concept / time-to-live metric | 😐 (internal metric name) |

## 4. Enterprise Layer

| Current name | What it is | Feel |
| :-- | :-- | :-- |
| **Enterprise Account** | Top-level customer | 🤖 |
| **Entity** | Department, brand, imprint, chapter under an account | 🤖 (flagged in doc's own "critical design principle") |
| **Enterprise Admin Console** | Cross-entity control panel | 🤖 |
| **Entity Management** | Create/configure entities | 🤖 |
| **Seat Allocation** | Assigning licenses across entities | 🤖 |
| **User Directory** | All internal users | 🤖 |
| **White-Labeled Entity Pages** | Branded public pages per entity | 🤖 |

Hierarchy as currently named:
**Enterprise Account → Entities → Workspaces/Programs → Opportunities → Submissions → Reviews → Decisions → Delivery**

## 5. Core Data Objects (also user-visible vocabulary)

| Current name | What it means | Feel |
| :-- | :-- | :-- |
| **Opportunity** / **Open Call** | A specific call, contest, grant cycle, issue | 😐 (the doc uses both interchangeably — pick one) |
| **Submission** | The incoming work | 😐 |
| **Submission Package** | Everything one submitter sends to one call | 🤖 |
| **Submission Item** | One work inside a package (one poem of five) | 🤖 |
| **Submission Path** | The configurable route (form + rules + fee + workflow) per genre/track | 🤖 (pure architecture-speak) |
| **Work** | A user's piece (poem, story, film, project) | ✨ (simple, dignified) |
| **Program** | Recurring initiative ("Annual Poetry Prize") | 😐 |
| **Workspace** | Operational area inside an entity | 🤖 |
| **ReviewRound** | A review stage | 🤖 |
| **Decision** | Outcome | 😐 |
| **Membership / Seat / Role / Permission** | Access model objects | 🤖 |
| **FileAsset** | Uploaded file | 🤖 |
| **AuditLog** | Immutable history | 🤖 |

Taxonomy dimensions (configurable, per doc): **Type, Genre, Category, Track, Medium**

## 6. Roles, Seats & Personas

| Current name | Who | Feel |
| :-- | :-- | :-- |
| **Submitter** | The creative/applicant | 🤖 (the doc's own personas say writers want "dignity" — "submitter" is bureaucratic) |
| **Reviewer** / **Reader** / **Judge** | Scores submissions | 😐 |
| **Enterprise Admin** | Controls whole account | 🤖 |
| **Entity Admin** | Manages one entity | 🤖 |
| **Program Manager** | Runs specific calls | 🤖 |
| **Finance Seat** | Fees, payouts, refunds | 🤖 |
| **Legal/Compliance Seat** | Agreements, consent, records | 🤖 |
| **Viewer / Read-only Seat** | Dashboards only | 🤖 |
| **External Collaborator** | Guest judge, partner reviewer | 🤖 |

## 7. Statuses (user-facing vocabulary, high renaming leverage)

**Opportunity Status** (the call itself):
Opening Soon · Open · Closing Soon · Deadline Extended · Closed · Rolling · Paused · Cancelled · Archived · Unknown

**My Status** (user's relationship to a call):
Interested · Saved · Preparing · Draft Started · Ready to Submit · Submitted · Received · In Review · Longlisted · Shortlisted · Finalist · Accepted · Declined · Waitlisted · Revision Requested · Withdrawn · Partially Withdrawn · Delivered · Archived

**Submission Status** (org side):
Draft · Submitted · Incomplete · Withdrawn · Ineligible · In Review · Shortlisted · Decision Pending · Accepted · Declined · Waitlisted · Deferred · Archived

**Item Status:** Submitted · Withdrawn · Under Review · Held · Accepted · Declined · Revision Requested · Published · Archived

**Review Status:** Unassigned · Assigned · In Progress · Completed · Conflict Declared · Reassigned · Overdue

**Delivery Status:** Not Started · Pending Submitter · Pending Admin · Pending Signature · Pending Payment · Complete · Overdue · Cancelled

## 8. Pricing Plan Names

| Current name | Target | Feel |
| :-- | :-- | :-- |
| **Free Organization Profile** | Any org, listing only | 🤖 |
| **Indie** | Small magazines, tiny contests ($15/mo) | ✨ |
| **Creative Pro** | Serious magazines, presses ($39/mo) | 😐 |
| **Program** | Grants, awards, fellowships ($99/mo) | 🤖 (collides with the "Program" data object) |
| **Program Pro** | Larger programs ($199/mo) | 🤖 |
| **Enterprise Starter** | Small multi-entity | 🤖 |
| **Enterprise** | Full multi-entity | 🤖 |
| **Founding Magazine / Founding Creative Pro / Founding Program Offer** | Launch pricing | ✨ |

## 9. Landing Page Narrative (already the strongest naming in the product)

| Current name | What it is |
| :-- | :-- |
| **The Correspondence** | Page concept (Dutch-master letter paintings) |
| Chapters: **Sent · Waiting · Answered · The Promise** | The product story in four acts |
| Nav: **Discover · Tracker · For organizations · Start free** | Top navigation |
| **"Every open call. Don't miss another deadline."** | Hero headline |
| **"Free for creatives. Forever."** | The Promise headline |
| **"Your submissions, finally self-updating."** | Killer positioning line (strategy doc) |

Note the mismatch worth resolving: the landing page speaks in human letters-and-waiting language
(Sent/Waiting/Answered), while the app vocabulary underneath is database language
(Submission Package, Entity, Pipeline View, Enterprise Admin Console). The renaming project is
largely about pulling the app's vocabulary up to the landing page's register.

---

## 10. Where to Look — Competitive Research Map

For each cluster, the competitors whose naming is worth studying (all from the strategy doc's market map):

| Missa part | Study these |
| :-- | :-- |
| Tracker, statuses, response windows | **Duotrope** (tracker + response stats), **Chill Subs** (playful writer-first naming), **Submission Grinder** (response-time data) |
| Discover / directory / marketplace | **Submittable Discover**, **Chill Subs**, **FilmFreeway** (browse + one-click submit), **CaFÉ/CallForEntry** |
| Submission Wallet / reusable profile | **FilmFreeway** ("Project" — create once, submit everywhere), **CaFÉ** (portfolio) |
| Org modules (Manage/Review/Decide) | **Submittable**, **SurveyMonkey Apply** (stages/automations), **OpenWater**, **Award Force** & **Evalato** (judging vocabulary), **Moksha**, **Duosuma**, **Subfolio** |
| Grants/enterprise vocabulary | **Fluxx**, **SmartSimple**, **Foundant GLM/SLM**, **Blackbaud Grantmaking**, **Good Grants**, **Submit.com** |
| Abstracts/conferences | **Oxford Abstracts** |
| Plan names | Submittable, Award Force, Jotform, Typeform, Tally pricing pages |

### Highest-leverage renames (start here)

1. **The 8 org modules** (Discover/Submit/Manage/Review/Decide/Message/Deliver/Analyze) — bare verbs, zero brand.
2. **Submitter** — the word every user is called; the doc's own persona research says writers want dignity.
3. **Gmail Auto-Tracking + Expected Response Window** — the two magic features, currently named like settings toggles.
4. **Submission Package / Item / Path** — user-visible in decisions ("item-level decisions"), named like schema.
5. **Missa Workspace / Enterprise hierarchy** (Account → Entity → Workspace/Program) — collides with Notion/Slack vocabulary and with its own "Program" plan name.
6. **Trust Layer / Fit Score / Eligibility Guardrails** — user-facing trust features named like infrastructure.

### Names to protect (already working)

**Missa** · **Radar** · **Passport** · **Submission Wallet** · **Props** · **Indie** (plan) · the landing-page narrative (**The Correspondence**, **Sent/Waiting/Answered/The Promise**, "Free for creatives. Forever.")
