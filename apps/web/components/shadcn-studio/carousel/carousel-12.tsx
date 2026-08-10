'use client'

import * as React from 'react'

import { motion } from 'motion/react'

import { Carousel, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-42.png',
    title: 'Mountain Sunrise',
    category: 'Nature'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-41.png',
    title: 'Ocean Waves',
    category: 'Seascape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-40.png',
    title: 'Forest Path',
    category: 'Woodland'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-39.png',
    title: 'Desert Dunes',
    category: 'Landscape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-38.png',
    title: 'City Lights',
    category: 'Urban'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-74.png',
    title: 'Autumn Colors',
    category: 'Seasonal'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-75.png',
    title: 'Winter Frost',
    category: 'Weather'
  }
]

const R = 240 // cylinder radius (px)
const THETA = 35 // angular step between neighbours (degrees)

const SPRING = { type: 'spring' as const, stiffness: 280, damping: 26, mass: 0.85 }

function arcStyle(offset: number) {
  const rad = (offset * THETA * Math.PI) / 180
  const abs = Math.abs(offset)

  return {
    x: R * Math.sin(rad),
    rotateY: -offset * THETA,
    scale: Math.max(0.48, 1 - abs * 0.16),
    opacity: abs > 2 ? 0 : Math.max(0.12, 1 - abs * 0.38),
    zIndex: 10 - abs
  }
}

const RadialCarousel = () => {
  const total = Images.length
  const [active, setActive] = React.useState(0)

  const go = React.useCallback((dir: 1 | -1) => setActive(i => (i + dir + total) % total), [total])

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }

    window.addEventListener('keydown', handler)

    return () => window.removeEventListener('keydown', handler)
  }, [go])

  return (
    <Carousel className='flex w-full flex-col items-center gap-8 py-8 select-none'>
      <div className='relative h-75 w-full'>
        {Images.map((slide, i) => {
          // Shortest signed offset around the loop
          const raw = (i - active + total) % total
          const offset = raw > total / 2 ? raw - total : raw
          const { x, rotateY, scale, opacity, zIndex } = arcStyle(offset)

          return (
            <motion.div
              key={i}
              className='absolute top-0 left-1/2 cursor-pointer'
              style={{ width: 200, height: 280, marginLeft: -100, zIndex }}
              animate={{ x, rotateY, scale, opacity }}
              transition={SPRING}
              onClick={() => setActive(i)}
              aria-label={`View ${slide.title}`}
            >
              <div className='relative size-full overflow-hidden rounded-2xl shadow-lg'>
                {/* Image */}
                <img src={slide.image} alt={slide.title} className='size-full object-cover' draggable={false} />

                {/* Gradient veil */}
                <div className='from-primary/70 via-primary/5 absolute inset-0 bg-linear-to-t to-transparent' />

                {/* Active-only label - Images in from below on focus */}
                <motion.div
                  className='absolute inset-x-0 bottom-0 px-4 pb-5'
                  animate={{ opacity: offset === 0 ? 1 : 0, y: offset === 0 ? 0 : 12 }}
                  transition={{ duration: 0.28 }}
                >
                  <span className='text-primary-foreground text-[10px] font-medium tracking-[0.18em] uppercase'>
                    {slide.category}
                  </span>
                  <p className='text-primary-foreground mt-0.5 text-sm leading-snug font-semibold'>{slide.title}</p>
                </motion.div>

                {/* Active ring */}
                <motion.div
                  className='pointer-events-none absolute inset-0 rounded-2xl'
                  animate={{ opacity: offset === 0 ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className='flex items-center gap-3'>
        <CarouselPrevious className='static top-auto left-auto translate-y-0' onClick={() => go(-1)} disabled={false} />

        <CarouselNext className='static top-auto right-auto translate-y-0' onClick={() => go(1)} disabled={false} />
      </div>
    </Carousel>
  )
}

export default RadialCarousel
