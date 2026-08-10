'use client'

import * as React from 'react'

import Autoplay from 'embla-carousel-autoplay'

import { type CarouselApi, Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-14.png',
    alt: 'Animals'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-15.png',
    alt: 'Mountain'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-16.png',
    alt: 'House'
  }
]

const CarouselThumbnails = () => {
  const [mainApi, setMainApi] = React.useState<CarouselApi>()
  const [thumbApi, setThumbApi] = React.useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = React.useState(0)

  const onThumbClick = React.useCallback(
    (index: number) => {
      if (!mainApi) return
      mainApi.scrollTo(index)
    },
    [mainApi]
  )

  const onSelect = React.useCallback(() => {
    if (!mainApi || !thumbApi) return
    const selected = mainApi.selectedScrollSnap()

    setActiveIndex(selected)
    thumbApi.scrollTo(selected)
  }, [mainApi, thumbApi])

  React.useEffect(() => {
    if (!mainApi) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onSelect()
    mainApi.on('select', onSelect)
    mainApi.on('reInit', onSelect)

    return () => {
      mainApi.off('select', onSelect)
      mainApi.off('reInit', onSelect)
    }
  }, [mainApi, onSelect])

  return (
    <div className='flex w-full max-w-xs flex-col gap-3'>
      {/* Main preview */}
      <Carousel
        setApi={setMainApi}
        opts={{ loop: false }}
        plugins={[
          Autoplay({
            delay: 2000
          })
        ]}
        className='w-full'
      >
        <CarouselContent>
          {Images.map((image, index) => (
            <CarouselItem key={index}>
              <div className='p-1'>
                <img src={image.image} alt={image.alt} className='h-full w-full rounded-md object-cover' />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Thumbnail strip */}
      <Carousel setApi={setThumbApi} opts={{ align: 'start', dragFree: true }} className='w-full'>
        <CarouselContent className='-ml-2'>
          {Images.map((image, index) => (
            <CarouselItem key={index} className='basis-1/3 cursor-pointer pl-2' onClick={() => onThumbClick(index)}>
              <div
                className={cn(
                  'overflow-hidden rounded-[14px] transition-all duration-200',
                  activeIndex === index ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                )}
              >
                <img src={image.image} alt={image.alt} className='h-20 w-full rounded-md object-cover' />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}

export default CarouselThumbnails
