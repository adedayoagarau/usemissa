'use client'

import * as React from 'react'

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

const images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-34.png',
    alt: 'Flowers'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-35.png',
    alt: 'Flowers'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-36.png',
    alt: 'Flowers'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-37.png',
    alt: 'Flowers'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-76.png',
    alt: 'Flowers'
  }
]

const CarouselScale = () => {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!api) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(api.selectedScrollSnap() + 1)

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  return (
    <Carousel className='w-full max-w-xs' opts={{ loop: true }} setApi={setApi}>
      <CarouselContent className='py-3'>
        {images.map((image, index) => (
          <CarouselItem className={cn('aspect-square basis-[55%]', {})} key={index}>
            <img
              alt={image.alt}
              className={cn('h-60 rounded-lg object-cover transition-all duration-600', {
                'scale-[0.6]': index !== current - 1
              })}
              src={image.image}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

export default CarouselScale
