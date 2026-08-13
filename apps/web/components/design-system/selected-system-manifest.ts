export type SelectedSystemSurface = 'foundation' | 'creator' | 'organization' | 'public' | 'internal'

export type SelectedSystemItem = {
  title: string
  objective: string
  selectedPath: `/design-system/${string}`
  comparisonPath?: `/design-system/${string}`
  selection: string
  surface: SelectedSystemSurface
  customerFacing: boolean
}

export type SelectedSystemGroup = {
  id: SelectedSystemSurface
  label: string
  description: string
  items: readonly SelectedSystemItem[]
}

export const selectedSystemGroups: readonly SelectedSystemGroup[] = [
  {
    id: 'foundation',
    label: 'Shared foundation',
    description: 'The navigation and context system every selected page family must inherit.',
    items: [
      {
        title: 'Shared shell',
        objective: 'Keep the canonical Missa wordmark, active product, person, Organization, role, and next destination legible at every width.',
        selectedPath: '/design-system/shell',
        comparisonPath: '/design-system/shell-directions',
        selection: '02 · Product switcher',
        surface: 'foundation',
        customerFacing: false,
      },
    ],
  },
  {
    id: 'creator',
    label: 'Creator journey',
    description: 'Discover, decide, prepare, track, and reuse Work without scores or hidden operational language.',
    items: [
      {
        title: 'Opportunities browse',
        objective: 'Support a fast pursue-or-skip decision while keeping taxonomy facets and eligibility separate.',
        selectedPath: '/design-system/opportunities-overhaul',
        selection: '02 desktop · 01 mobile',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Opportunity journey',
        objective: 'Review the public shell, browse, detail, auth return, and Tracker handoff as one connected path.',
        selectedPath: '/design-system/opportunity-journey',
        selection: 'Five-screen promotion tranche',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Opportunity detail',
        objective: 'Explain decisive facts, requirements, and the official source without inventing certainty.',
        selectedPath: '/design-system/opportunity-detail',
        comparisonPath: '/design-system/opportunity-detail-directions',
        selection: 'Selected synthesis',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Profile',
        objective: 'Separate public identity, private preferences, field taxonomy, and integration state.',
        selectedPath: '/design-system/profile',
        comparisonPath: '/design-system/profile-directions',
        selection: '02 · Profile ledger',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Tracker',
        objective: 'Keep saved Opportunities, preparation, Submissions, dates, and next actions understandable.',
        selectedPath: '/design-system/tracker',
        comparisonPath: '/design-system/tracker-directions',
        selection: 'Selected synthesis',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Tracker calendar',
        objective: 'Place exact deadlines by date while retaining rolling, conflicting, unknown, and response items.',
        selectedPath: '/design-system/calendar',
        comparisonPath: '/design-system/calendar-directions',
        selection: '02 · Month + agenda',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Library and Work',
        objective: 'Retrieve reusable Work across visual, text, sound, performance, and interdisciplinary work.',
        selectedPath: '/design-system/library-work',
        selection: '02 · Working archive',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Inbox',
        objective: 'Show consequential changes and required actions without becoming a source-health dashboard.',
        selectedPath: '/design-system/inbox',
        comparisonPath: '/design-system/inbox-directions',
        selection: 'Selected synthesis',
        surface: 'creator',
        customerFacing: true,
      },
      {
        title: 'Home, Import, and Ask',
        objective: 'Keep three bounded utilities evidence-backed, reversible, and honest about unavailable capability.',
        selectedPath: '/design-system/creator-utilities',
        comparisonPath: '/design-system/creator-utilities-directions',
        selection: '02 · Creator desk',
        surface: 'creator',
        customerFacing: true,
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization journey',
    description: 'Operate Opportunities and applications with explicit role, scope, consequence, and recovery.',
    items: [
      {
        title: 'Organization chooser and overview',
        objective: 'Keep Organization and role context stable while routing attention to the exact task.',
        selectedPath: '/design-system/organization',
        comparisonPath: '/design-system/organization-directions',
        selection: '01 · Context rail',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Organization Opportunities',
        objective: 'Manage an Opportunity inventory and a structured builder without collapsing independent rules.',
        selectedPath: '/design-system/organization-opportunities',
        comparisonPath: '/design-system/organization-opportunities-directions',
        selection: '01 · Operational index',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Submissions, reviews, and decisions',
        objective: 'Preserve lifecycle state, evidence, rubric context, authority, and irreversible decision boundaries.',
        selectedPath: '/design-system/organization-workflow',
        comparisonPath: '/design-system/organization-workflow-directions',
        selection: 'Surface-aware synthesis',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Messages and delivery',
        objective: 'Separate internal notes, external messages, delivery outcomes, and accepted-Work fulfilment.',
        selectedPath: '/design-system/organization-messages-delivery',
        comparisonPath: '/design-system/organization-messages-delivery-directions',
        selection: '02 · Outcome desk',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Insights',
        objective: 'Answer programme questions with declared denominators, exclusions, and multi-valued taxonomy.',
        selectedPath: '/design-system/organization-insights',
        comparisonPath: '/design-system/organization-insights-directions',
        selection: '02 · Program lens',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'People and permissions',
        objective: 'Make effective access, role bundle, resource scope, invitation, and seat state distinct.',
        selectedPath: '/design-system/organization-people-permissions',
        comparisonPath: '/design-system/organization-people-permissions-directions',
        selection: '02 · Access dossier',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Settings and billing',
        objective: 'Give each settings domain its own save, authority, risk, and recovery boundary.',
        selectedPath: '/design-system/organization-settings-billing',
        comparisonPath: '/design-system/organization-settings-billing-directions',
        selection: '02 · Control centre',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Public Organization profile',
        objective: 'Lead with active Opportunities and narrow identity evidence rather than institutional vanity metrics.',
        selectedPath: '/design-system/public-organization-profile',
        comparisonPath: '/design-system/public-organization-profile-directions',
        selection: '02 · Opportunity-first profile',
        surface: 'organization',
        customerFacing: true,
      },
      {
        title: 'Hosted application',
        objective: 'Keep public reading, private drafting, Work snapshots, review, payment, submission, and receipt distinct.',
        selectedPath: '/design-system/hosted-application',
        comparisonPath: '/design-system/hosted-application-directions',
        selection: '02 · Application desk',
        surface: 'organization',
        customerFacing: true,
      },
    ],
  },
  {
    id: 'public',
    label: 'Public and access',
    description: 'Useful public evidence and recoverable entry journeys without invented proof or generic marketing theatre.',
    items: [
      {
        title: 'Public and acquisition',
        objective: 'Match each public page to immediate usefulness or editorial evidence while preserving source boundaries.',
        selectedPath: '/design-system/public-acquisition',
        comparisonPath: '/design-system/public-acquisition-directions',
        selection: 'Surface-aware synthesis',
        surface: 'public',
        customerFacing: true,
      },
      {
        title: 'Authentication and onboarding',
        objective: 'Preserve interrupted intent and use progressive onboarding rather than one template for every journey.',
        selectedPath: '/design-system/auth-onboarding',
        comparisonPath: '/design-system/auth-onboarding-directions',
        selection: 'Journey-aware synthesis',
        surface: 'public',
        customerFacing: true,
      },
    ],
  },
  {
    id: 'internal',
    label: 'Focused internal work',
    description: 'Deliberate evidence and operations surfaces that keep internal state out of customer pages.',
    items: [
      {
        title: 'Reviewer',
        objective: 'Cross-reference assigned Work against a versioned rubric without leaking identity or unrelated records.',
        selectedPath: '/design-system/reviewer',
        comparisonPath: '/design-system/reviewer-directions',
        selection: '02 · Evidence desk',
        surface: 'internal',
        customerFacing: false,
      },
      {
        title: 'Platform Admin',
        objective: 'Join operational state to evidence, bounded action, acknowledgement, and an auditable recovery path.',
        selectedPath: '/design-system/admin',
        comparisonPath: '/design-system/admin-directions',
        selection: '02 · Evidence control room',
        surface: 'internal',
        customerFacing: false,
      },
    ],
  },
]

export const selectedSystemItems: readonly SelectedSystemItem[] = selectedSystemGroups.flatMap((group) => group.items)
