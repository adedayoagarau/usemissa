import type { Metadata } from 'next'

import {
  createReviewReferences,
  ReviewReferenceGrid,
} from '@/components/shadcn-studio/review-grid'

import Kbd01 from '@/components/shadcn-studio/kbd/kbd-01'
import Kbd02 from '@/components/shadcn-studio/kbd/kbd-02'
import Kbd03 from '@/components/shadcn-studio/kbd/kbd-03'
import Kbd04 from '@/components/shadcn-studio/kbd/kbd-04'
import Kbd05 from '@/components/shadcn-studio/kbd/kbd-05'
import Kbd06 from '@/components/shadcn-studio/kbd/kbd-06'
import Kbd07 from '@/components/shadcn-studio/kbd/kbd-07'
import Kbd08 from '@/components/shadcn-studio/kbd/kbd-08'
import Rating01 from '@/components/shadcn-studio/rating/rating-01'
import Rating02 from '@/components/shadcn-studio/rating/rating-02'
import Rating03 from '@/components/shadcn-studio/rating/rating-03'
import Rating04 from '@/components/shadcn-studio/rating/rating-04'
import Rating05 from '@/components/shadcn-studio/rating/rating-05'
import Rating06 from '@/components/shadcn-studio/rating/rating-06'
import Rating07 from '@/components/shadcn-studio/rating/rating-07'
import Rating08 from '@/components/shadcn-studio/rating/rating-08'
import Slider01 from '@/components/shadcn-studio/slider/slider-01'
import Slider02 from '@/components/shadcn-studio/slider/slider-02'
import Slider03 from '@/components/shadcn-studio/slider/slider-03'
import Slider04 from '@/components/shadcn-studio/slider/slider-04'
import Slider05 from '@/components/shadcn-studio/slider/slider-05'
import Slider06 from '@/components/shadcn-studio/slider/slider-06'
import Slider07 from '@/components/shadcn-studio/slider/slider-07'
import Slider08 from '@/components/shadcn-studio/slider/slider-08'
import Slider09 from '@/components/shadcn-studio/slider/slider-09'
import Slider10 from '@/components/shadcn-studio/slider/slider-10'
import Slider11 from '@/components/shadcn-studio/slider/slider-11'
import Slider12 from '@/components/shadcn-studio/slider/slider-12'
import Slider13 from '@/components/shadcn-studio/slider/slider-13'
import Slider14 from '@/components/shadcn-studio/slider/slider-14'
import Slider15 from '@/components/shadcn-studio/slider/slider-15'
import Slider16 from '@/components/shadcn-studio/slider/slider-16'
import Slider17 from '@/components/shadcn-studio/slider/slider-17'
import Slider18 from '@/components/shadcn-studio/slider/slider-18'
import Slider19 from '@/components/shadcn-studio/slider/slider-19'
import Spinner01 from '@/components/shadcn-studio/spinner/spinner-01'
import Spinner02 from '@/components/shadcn-studio/spinner/spinner-02'
import Spinner03 from '@/components/shadcn-studio/spinner/spinner-03'
import Spinner04 from '@/components/shadcn-studio/spinner/spinner-04'
import Spinner05 from '@/components/shadcn-studio/spinner/spinner-05'
import Spinner06 from '@/components/shadcn-studio/spinner/spinner-06'
import Spinner07 from '@/components/shadcn-studio/spinner/spinner-07'
import Spinner08 from '@/components/shadcn-studio/spinner/spinner-08'
import Spinner09 from '@/components/shadcn-studio/spinner/spinner-09'
import Spinner10 from '@/components/shadcn-studio/spinner/spinner-10'
import Toggle01 from '@/components/shadcn-studio/toggle/toggle-01'
import Toggle02 from '@/components/shadcn-studio/toggle/toggle-02'
import Toggle03 from '@/components/shadcn-studio/toggle/toggle-03'
import Toggle04 from '@/components/shadcn-studio/toggle/toggle-04'
import Toggle05 from '@/components/shadcn-studio/toggle/toggle-05'
import Toggle06 from '@/components/shadcn-studio/toggle/toggle-06'
import Toggle07 from '@/components/shadcn-studio/toggle/toggle-07'
import Toggle08 from '@/components/shadcn-studio/toggle/toggle-08'
import Toggle09 from '@/components/shadcn-studio/toggle/toggle-09'
import Toggle10 from '@/components/shadcn-studio/toggle/toggle-10'
import Toggle11 from '@/components/shadcn-studio/toggle/toggle-11'
import Toggle12 from '@/components/shadcn-studio/toggle/toggle-12'
import Toggle13 from '@/components/shadcn-studio/toggle/toggle-13'
import Toggle14 from '@/components/shadcn-studio/toggle/toggle-14'
import ToggleGroup01 from '@/components/shadcn-studio/toggle-group/toggle-group-01'
import ToggleGroup02 from '@/components/shadcn-studio/toggle-group/toggle-group-02'
import ToggleGroup03 from '@/components/shadcn-studio/toggle-group/toggle-group-03'
import ToggleGroup04 from '@/components/shadcn-studio/toggle-group/toggle-group-04'
import ToggleGroup05 from '@/components/shadcn-studio/toggle-group/toggle-group-05'
import ToggleGroup06 from '@/components/shadcn-studio/toggle-group/toggle-group-06'
import ToggleGroup07 from '@/components/shadcn-studio/toggle-group/toggle-group-07'
import ToggleGroup08 from '@/components/shadcn-studio/toggle-group/toggle-group-08'
import ToggleGroup09 from '@/components/shadcn-studio/toggle-group/toggle-group-09'
import ToggleGroup10 from '@/components/shadcn-studio/toggle-group/toggle-group-10'
import ToggleGroup11 from '@/components/shadcn-studio/toggle-group/toggle-group-11'
import ToggleGroup12 from '@/components/shadcn-studio/toggle-group/toggle-group-12'
import ToggleGroup13 from '@/components/shadcn-studio/toggle-group/toggle-group-13'
import ToggleGroup14 from '@/components/shadcn-studio/toggle-group/toggle-group-14'
import ToggleGroup15 from '@/components/shadcn-studio/toggle-group/toggle-group-15'
import ToggleGroup16 from '@/components/shadcn-studio/toggle-group/toggle-group-16'

export const metadata: Metadata = {
  title: "Control and Feedback family · Missa design review",
  robots: {
    index: false,
    follow: false,
  },
}

const kbdReferences = createReviewReferences(
  [Kbd01, Kbd02, Kbd03, Kbd04, Kbd05, Kbd06, Kbd07, Kbd08],
  ["Key","Key chord","Tooltip key","Input shortcut","Special key","Special key group","Shortcut list","Modifier keys"],
  "Keyboard affordance",
)

const ratingReferences = createReviewReferences(
  [Rating01, Rating02, Rating03, Rating04, Rating05, Rating06, Rating07, Rating08],
  ["Default rating","Half-star rating","Read-only rating","Rating sizes","Large rating","Custom icon","Controlled rating","Emoji rating"],
  "Human feedback",
)

const sliderReferences = createReviewReferences(
  [Slider01, Slider02, Slider03, Slider04, Slider05, Slider06, Slider07, Slider08, Slider09, Slider10, Slider11, Slider12, Slider13, Slider14, Slider15, Slider16, Slider17, Slider18, Slider19],
  ["Default slider","Multi-thumb","Vertical slider","Vertical range","Disabled slider","Thumb shapes","Labeled slider","Fixed drag","Stepped slider","Dynamic value","Tooltip slider","Multi-tooltip","Slider with input","Range slider","Rating slider","Radius slider","3D slider","Histogram slider","Image filter"],
  "Continuous value",
)

const spinnerReferences = createReviewReferences(
  [Spinner01, Spinner02, Spinner03, Spinner04, Spinner05, Spinner06, Spinner07, Spinner08, Spinner09, Spinner10],
  ["Default spinner","Icon spinner","Spinner sizes","Spinner colors","Button spinner","Text spinner","Input spinner","Blur spinner","Processing spinner","Spinner shapes"],
  "Progress feedback",
)

const toggleReferences = createReviewReferences(
  [Toggle01, Toggle02, Toggle03, Toggle04, Toggle05, Toggle06, Toggle07, Toggle08, Toggle09, Toggle10, Toggle11, Toggle12, Toggle13, Toggle14],
  ["Default toggle","Outline toggle","Toggle sizes","Disabled toggle","Filled icon","Text pattern","Icon pattern","Icon toggle","Emoji toggle","Text toggle","Icon and text","Tooltip toggle","Animated toggle","Animated icon"],
  "Binary preference",
)

const toggleGroupReferences = createReviewReferences(
  [ToggleGroup01, ToggleGroup02, ToggleGroup03, ToggleGroup04, ToggleGroup05, ToggleGroup06, ToggleGroup07, ToggleGroup08, ToggleGroup09, ToggleGroup10, ToggleGroup11, ToggleGroup12, ToggleGroup13, ToggleGroup14, ToggleGroup15, ToggleGroup16],
  ["Default group","Text group","Group sizes","Group spacing","Vertical group","Disabled group","Aligned group","Layout group","Tooltip group","Pricing group","Styled group","Responsive layout","Toolbar group","Review group","Package group","Theme group"],
  "Grouped preference",
)

const sections = [
  {
    id: 'kbd',
    title: "KBD family",
    description: "Keyboard hints, shortcut chords, tooltips, inputs, special keys, and modifier patterns.",
    references: kbdReferences,
  },
  {
    id: 'rating',
    title: "Rating family",
    description: "Interactive, half-star, read-only, sized, icon, controlled, and emoji rating patterns.",
    references: ratingReferences,
  },
  {
    id: 'slider',
    title: "Slider family",
    description: "Single and multi-thumb values, vertical layouts, labels, tooltips, inputs, ranges, histograms, and media controls.",
    references: sliderReferences,
  },
  {
    id: 'spinner',
    title: "Spinner family",
    description: "Loading indicators, sizes, colors, buttons, text, inputs, blur, processing, and shape treatments.",
    references: spinnerReferences,
  },
  {
    id: 'toggle',
    title: "Toggle family",
    description: "Default, outline, size, disabled, icon, text, tooltip, emoji, controlled, and animated toggles.",
    references: toggleReferences,
  },
  {
    id: 'toggleGroup',
    title: "Toggle Group family",
    description: "Grouped selection with text, sizes, spacing, orientation, alignment, layouts, tooltips, pricing, toolbar, reviews, packages, and themes.",
    references: toggleGroupReferences,
  },
]

const rules = [
  [
    "Value has meaning",
    "Sliders and ratings need labels, ranges, keyboard support, and visible values when a decision depends on precision."
  ],
  [
    "Binary is not vague",
    "Toggle states must name the preference, expose current state, and never replace a more appropriate checkbox or select."
  ],
  [
    "Loading is honest",
    "Spinners should indicate a real pending operation, preserve context, and never imply completion before the request resolves."
  ],
  [
    "Motion has a boundary",
    "Animated toggle treatments remain special-purpose references; the default Organization control should be calm and predictable."
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
            Controls should communicate state before asking for trust.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 8 premium KBD, 8 premium Rating, 19 premium Slider, 10 premium Spinner, 14 premium Toggle, and 16 premium Toggle Group references are installed here for review. This is a local library surface only; nothing has been promoted into product
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
