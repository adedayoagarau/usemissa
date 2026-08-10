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
import { Progress } from '@/components/ui/progress'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-38.png',
    alt: 'Silhouettes on beach'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-39.png',
    alt: 'Snowy mountain peaks'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-40.png',
    alt: 'Rolling green hills'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-41.png',
    alt: 'Sunset landscape'
  }
]

const CarouselProgress = () => {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  const progress = (current * 100) / count

  React.useEffect(() => {
    if (!api) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(api.scrollSnapList().length)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(api.selectedScrollSnap() + 1)

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  return (
    <div className='mx-auto max-w-xs py-4'>
      <Carousel className='w-full max-w-xs' setApi={setApi}>
        <CarouselContent>
          {Images.map((image, index) => (
            <CarouselItem key={index}>
              <div className='p-1'>
                <img src={image.image} alt={image.alt} className='h-94.5 w-full rounded-md object-cover' />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='top-[calc(100%+0.5rem)] left-1 translate-y-0' />
        <CarouselNext className='top-[calc(100%+0.5rem)] left-3 translate-x-full translate-y-0' />
      </Carousel>
      <Progress value={progress} className='mt-5 mr-1 ml-auto w-24' />
    </div>
  )
}

export default CarouselProgress
