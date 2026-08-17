'use client'

import { useEffect, useState } from 'react'

import { Card } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/testimonials/image-19.png',
    alt: 'Craig Bator',
    name: 'Craig Bator',
    role: 'CEO & Co-Founder'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/testimonials/image-22.png',
    alt: 'Michael Smith',
    name: 'Michael Smith',
    role: 'Lead Designer'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/testimonials/image-21.png',
    alt: 'Sarah Lee',
    name: 'Sarah Lee',
    role: 'CTO & Co-Founder'
  }
]

const CarouselDots = () => {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return

    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <Carousel setApi={setApi} className='w-full max-w-xs'>
      <CarouselContent>
        {Images.map((image, index) => (
          <CarouselItem key={index}>
            <div className='p-1'>
              <Card className='group/card relative aspect-square overflow-hidden border-0 p-0'>
                <img src={image.image} alt={image.alt} className='h-full w-full rounded-md object-cover' />

                {/* Content */}
                <div className='bg-muted/50 absolute inset-0 top-auto flex flex-col justify-end p-4'>
                  <h3 className='text-xl font-medium'>{image.name}</h3>
                  <p className='text-sm'>{image.role}</p>
                </div>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Dots Navigation */}
      <div className='flex justify-center gap-2 py-3'>
        {Images.map((_, index) => (
          <button
            key={index}
            className={cn(
              'h-2 w-4 origin-center cursor-pointer rounded-full transition-all duration-500 ease-in-out',
              index === current
                ? 'bg-primary scale-x-100 opacity-100'
                : 'bg-muted-foreground scale-x-50 opacity-30 hover:opacity-50'
            )}
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </Carousel>
  )
}

export default CarouselDots
