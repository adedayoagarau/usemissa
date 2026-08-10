import type { Metadata } from 'next'

import {
  createReviewReferences,
  ReviewReferenceGrid,
} from '@/components/shadcn-studio/review-grid'

import Separator01 from '@/components/shadcn-studio/separator/separator-01'
import Separator02 from '@/components/shadcn-studio/separator/separator-02'
import Separator03 from '@/components/shadcn-studio/separator/separator-03'
import Separator04 from '@/components/shadcn-studio/separator/separator-04'
import Separator05 from '@/components/shadcn-studio/separator/separator-05'
import Separator06 from '@/components/shadcn-studio/separator/separator-06'
import Separator07 from '@/components/shadcn-studio/separator/separator-07'
import Separator08 from '@/components/shadcn-studio/separator/separator-08'
import Separator09 from '@/components/shadcn-studio/separator/separator-09'
import Separator10 from '@/components/shadcn-studio/separator/separator-10'
import Separator11 from '@/components/shadcn-studio/separator/separator-11'
import Separator12 from '@/components/shadcn-studio/separator/separator-12'
import Separator13 from '@/components/shadcn-studio/separator/separator-13'
import Separator14 from '@/components/shadcn-studio/separator/separator-14'
import Stepper01 from '@/components/shadcn-studio/stepper/stepper-01'
import Stepper02 from '@/components/shadcn-studio/stepper/stepper-02'
import Stepper03 from '@/components/shadcn-studio/stepper/stepper-03'
import Stepper04 from '@/components/shadcn-studio/stepper/stepper-04'
import Stepper05 from '@/components/shadcn-studio/stepper/stepper-05'
import Stepper06 from '@/components/shadcn-studio/stepper/stepper-06'
import Stepper07 from '@/components/shadcn-studio/stepper/stepper-07'
import Stepper08 from '@/components/shadcn-studio/stepper/stepper-08'
import Stepper09 from '@/components/shadcn-studio/stepper/stepper-09'
import Stepper10 from '@/components/shadcn-studio/stepper/stepper-10'
import Stepper11 from '@/components/shadcn-studio/stepper/stepper-11'
import Stepper12 from '@/components/shadcn-studio/stepper/stepper-12'
import Typography01 from '@/components/shadcn-studio/typography/typography-01'
import Typography02 from '@/components/shadcn-studio/typography/typography-02'
import Typography03 from '@/components/shadcn-studio/typography/typography-03'
import Typography04 from '@/components/shadcn-studio/typography/typography-04'
import Typography05 from '@/components/shadcn-studio/typography/typography-05'
import Typography06 from '@/components/shadcn-studio/typography/typography-06'
import Typography07 from '@/components/shadcn-studio/typography/typography-07'
import Typography08 from '@/components/shadcn-studio/typography/typography-08'
import Typography09 from '@/components/shadcn-studio/typography/typography-09'
import Typography10 from '@/components/shadcn-studio/typography/typography-10'
import Typography11 from '@/components/shadcn-studio/typography/typography-11'
import Typography12 from '@/components/shadcn-studio/typography/typography-12'
import Typography13 from '@/components/shadcn-studio/typography/typography-13'
import Typography14 from '@/components/shadcn-studio/typography/typography-14'
import Typography15 from '@/components/shadcn-studio/typography/typography-15'

export const metadata: Metadata = {
  title: "Progress and Typography family · Missa design review",
  robots: {
    index: false,
    follow: false,
  },
}

const separatorReferences = createReviewReferences(
  [Separator01, Separator02, Separator03, Separator04, Separator05, Separator06, Separator07, Separator08, Separator09, Separator10, Separator11, Separator12, Separator13, Separator14],
  ["Default separator","Vertical separator","Detail separator","Vertical description","Multiple separators","Styled separator","Text separator","Vertical text","Text separator variant","Vertical text variant","Color styles","Weight styles","Button separator","Vertical button separator"],
  "Visual structure",
)

const stepperReferences = createReviewReferences(
  [Stepper01, Stepper02, Stepper03, Stepper04, Stepper05, Stepper06, Stepper07, Stepper08, Stepper09, Stepper10, Stepper11, Stepper12],
  ["Basic steps","Vertical steps","Step descriptions","Custom indicators","Compact steps","Responsive steps","Validation steps","Loading step","Navigation steps","Form workflow","Timeline steps","Complete workflow"],
  "Workflow progress",
)

const typographyReferences = createReviewReferences(
  [Typography01, Typography02, Typography03, Typography04, Typography05, Typography06, Typography07, Typography08, Typography09, Typography10, Typography11, Typography12, Typography13, Typography14, Typography15],
  ["Heading one","Heading two","Heading three","Heading four","Paragraph","Blockquote","Typography table","Typography list","Inline code","Large text","Small text","Muted text","Gradient text","First-letter treatment","Composed typography"],
  "Editorial hierarchy",
)

const sections = [
  {
    id: 'separator',
    title: "Separator family",
    description: "Horizontal, vertical, detailed, text, styled, multi-section, and action-separating patterns.",
    references: separatorReferences,
  },
  {
    id: 'stepper',
    title: "Stepper family",
    description: "Step-by-step workflows for progress, forms, validation, loading, navigation, timelines, and completion.",
    references: stepperReferences,
  },
  {
    id: 'typography',
    title: "Typography family",
    description: "Headings, paragraphs, quotes, tables, lists, code, scale, gradients, first-letter treatments, and composed text.",
    references: typographyReferences,
  },
]

const rules = [
  [
    "Structure is semantic",
    "Separators support hierarchy; they should clarify grouping without becoming decoration or replacing a meaningful heading."
  ],
  [
    "Progress is truthful",
    "Steppers should show where someone is, what remains, what failed, and whether returning to an earlier step is safe."
  ],
  [
    "Type carries hierarchy",
    "Typography choices need consistent roles across creator, organization, evidence, and public surfaces."
  ],
  [
    "Evidence stays readable",
    "Code, quotes, tables, lists, and long-form text must preserve provenance, contrast, wrapping, and mobile readability."
  ]
]

export default function DesignSystemReviewPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Progress and language should make the next step clear.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 14 premium Separator, 12 premium Stepper, and 15 premium Typography references are installed here for review. This is a local library surface only; nothing has been promoted into product
            routes.
          </p>
        </header>

        <section className='mt-12 space-y-16'>
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <h2 id={section.id} className='text-2xl font-semibold tracking-tight'>
                    {section.title}
                  </h2>
                  <p className='mt-1 text-sm text-muted-foreground'>{section.description}</p>
                </div>
                <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
                  {section.references.length} references
                </p>
              </div>
              <ReviewReferenceGrid references={section.references} />
            </section>
          ))}
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='review-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='review-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa review rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down semantics, keyboard behavior, responsive fallbacks, state persistence, and
              accessibility as one coherent product contract.
            </p>
          </div>
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {rules.map(([title, description]) => (
              <div key={title} className='rounded-2xl border bg-background p-5'>
                <h3 className='font-semibold'>{title}</h3>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
