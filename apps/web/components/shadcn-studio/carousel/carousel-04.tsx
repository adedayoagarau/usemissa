'use client'

import * as React from 'react'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-4.png',
    alt: 'Silhouettes on beach'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-3.png',
    alt: 'Snowy mountain peaks'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-2.png',
    alt: 'Rolling green hills'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-1.png',
    alt: 'Sunset landscape'
  }
]

const CarouselApiDemo = () => {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  return (
    <div className='mx-auto max-w-40 sm:max-w-xs'>
      <Carousel setApi={setApi} className='w-full max-w-xs'>
        <CarouselContent>
          {Images.map((image, index) => (
            <CarouselItem key={index}>
              <img src={image.image} alt={image.alt} className='h-full w-full rounded-md object-cover' />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div className='text-muted-foreground py-2 text-center text-sm'>
        Slide {current} of {count}
      </div>
    </div>
  )
}

export default CarouselApiDemo
