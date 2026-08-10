'use client'

import * as React from 'react'

import type { EmblaOptionsType } from 'embla-carousel'

import { MotionCarousel } from '@/components/ui/motion-carousel'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-1.png',
    alt: 'Silhouettes on beach'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-2.png',
    alt: 'Snowy mountain peaks'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-3.png',
    alt: 'Rolling green hills'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-4.png',
    alt: 'Sunset landscape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-7.png',
    alt: 'Sunset landscape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-8.png',
    alt: 'Sunset landscape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-9.png',
    alt: 'Sunset landscape'
  }
]

const CarouselScale = () => {
  const OPTIONS: EmblaOptionsType = { loop: true }
  const SLIDES = Array.from(Array(Images.length).keys())

  return (
    <div className='flex flex-col items-center justify-center gap-4'>
      <MotionCarousel slides={SLIDES} options={OPTIONS} images={Images.map(img => img.image)} />
      <p className='text-muted-foreground text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://animate-ui.com/docs/components/community/motion-carousel'
          target='_blank'
          rel='noopener noreferrer'
        >
          Animate UI
        </a>
      </p>
    </div>
  )
}

export default CarouselScale
