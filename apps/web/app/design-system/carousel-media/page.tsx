import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Carousel01 from '@/components/shadcn-studio/carousel/carousel-01'
import Carousel02 from '@/components/shadcn-studio/carousel/carousel-02'
import Carousel03 from '@/components/shadcn-studio/carousel/carousel-03'
import Carousel04 from '@/components/shadcn-studio/carousel/carousel-04'
import Carousel05 from '@/components/shadcn-studio/carousel/carousel-05'
import Carousel06 from '@/components/shadcn-studio/carousel/carousel-06'
import Carousel07 from '@/components/shadcn-studio/carousel/carousel-07'
import Carousel08 from '@/components/shadcn-studio/carousel/carousel-08'
import Carousel09 from '@/components/shadcn-studio/carousel/carousel-09'
import Carousel10 from '@/components/shadcn-studio/carousel/carousel-10'
import Carousel11 from '@/components/shadcn-studio/carousel/carousel-11'
import Carousel12 from '@/components/shadcn-studio/carousel/carousel-12'
import AspectRatio01 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-01'
import AspectRatio02 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-02'
import AspectRatio03 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-03'
import AspectRatio04 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-04'
import AspectRatio05 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-05'
import AspectRatio06 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-06'
import AspectRatio07 from '@/components/shadcn-studio/aspect-ratio/aspect-ratio-07'

export const metadata: Metadata = {
  title: 'Carousel and Media family · Missa design review',
  robots: {
    index: false,
    follow: false,
  },
}

type Reference = {
  id: string
  label: string
  note: string
  Component: ComponentType
}

function createReferences(components: ComponentType[], labels: string[], note: string): Reference[] {
  return components.map((Component, index) => ({
    id: String(index + 1).padStart(2, '0'),
    label: labels[index] ?? `Variant ${String(index + 1).padStart(2, '0')}`,
    note,
    Component,
  }))
}

const carouselComponents: ComponentType[] = [Carousel01, Carousel02, Carousel03, Carousel04, Carousel05, Carousel06, Carousel07, Carousel08, Carousel09, Carousel10, Carousel11, Carousel12]
const aspectratioComponents: ComponentType[] = [AspectRatio01, AspectRatio02, AspectRatio03, AspectRatio04, AspectRatio05, AspectRatio06, AspectRatio07]

const carouselLabels = ["Default carousel","Multi-slide carousel","Vertical carousel","API-controlled carousel","Autoplay carousel","Peek carousel","Thumbnail carousel","Dots carousel","Progress carousel","Scale carousel","Motion carousel","Radial carousel"]
const aspectratioLabels = ["16:9 media","9:16 media","3:4 media","4:3 media","1:1 media","3:2 media","21:9 media"]

const carouselReferences = createReferences(carouselComponents, carouselLabels, 'Media navigation')
const aspectratioReferences = createReferences(aspectratioComponents, aspectratioLabels, 'Media geometry')

function ReferenceGrid({ references }: { references: Reference[] }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-80 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
            <div className='mb-6 flex items-start justify-between gap-4'>
              <div>
                <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                  {reference.id}
                </p>
                <h3 className='mt-1 text-sm font-semibold'>{reference.label}</h3>
              </div>
              <span className='shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground'>
                {reference.note}
              </span>
            </div>
            <div className='flex min-h-56 flex-1 items-center justify-center overflow-auto rounded-xl bg-muted/40 p-5'>
              <div className='flex w-full min-w-0 justify-center'>
                <Demo />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

const rules = [
  ['Do not hide core navigation', 'Carousels are useful for browsing related media; they should not be the only way to reach critical information or actions.'],
  ['Controls stay discoverable', 'Previous, next, position, and pause behavior must remain visible, keyboard-accessible, and understandable without relying on motion.'],
  ['Autoplay is opt-in', 'Autoplay needs a clear reason, a pause path, reduced-motion respect, and no unexpected movement near forms or evidence.'],
  ['Geometry prevents shift', 'Aspect Ratio and media containers should preserve layout geometry while content loads, swaps, or changes orientation.'],
]

const sections = [
  {
    id: 'carousel-family',
    title: 'Carousel family',
    description: 'Horizontal, vertical, autoplay, thumbnail, progress, motion, and editorial gallery treatments.',
    references: carouselReferences,
  },
  {
    id: 'aspect-ratio-family',
    title: 'Aspect Ratio family',
    description: 'Stable media geometry for gallery images, cards, profile surfaces, and responsive content.',
    references: aspectratioReferences,
  },
]

export default function CarouselMediaDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Media should move without losing its frame.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 12 premium Carousel and 7 premium Aspect Ratio references are installed here for
            review. This is a local library surface only; nothing has been promoted into product
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
              <ReferenceGrid references={section.references} />
            </section>
          ))}
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='media-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='media-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa media rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us range. Before product adoption, we will lock down
              captions, alt text, keyboard controls, reduced-motion behavior, loading states, image
              provenance, and the boundary between editorial media and operational evidence.
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

