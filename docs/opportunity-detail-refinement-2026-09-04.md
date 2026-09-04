# Opportunity detail refinement

The existing OpportunityDetailView now follows the white-index direction: compact interface title, quiet facts, unboxed reading sections and a supporting organizer/facts rail. Actual call text, eligibility and preparation content remain. Shared SaveToTrackerButton, AddOpportunityToCalendarButton and MobileActionDock provide established actions. On mobile Save/Apply stay in the dock while calendar remains near the summary. Official destination resolution and authentication behavior are unchanged.

Removed public reputation tiers and placeholder turnaround statements. Response time displays only when a numeric response duration exists. Profile kinds and disciplines are humanized. Organization-level reading windows are labelled as such. Missing deadline dates no longer default to Rolling or imply an open deadline. Day-based countdown uses midnight-to-midnight comparison; the supplied September 4 record now says today rather than tomorrow.

Components use existing approved controls and semantic tokens; the catalogue records this detail variant. No new registry components installed.

Validation: supplied NYFA grant reviewed at desktop and 390px, no browser errors observed. Scoped ESLint, TypeScript no-emit and design-system checks passed. Existing dock and calendar availability inspected. Other opportunity types, authenticated mutations, downloaded calendar import, 200% zoom and exhaustive keyboard testing were not exercised in this pass. No production deployment.
