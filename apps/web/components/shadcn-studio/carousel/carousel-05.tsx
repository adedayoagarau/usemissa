'use client'

import * as React from 'react'

import Autoplay from 'embla-carousel-autoplay'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-65.png',
    alt: 'Silhouettes on beach'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-66.png',
    alt: 'Snowy mountain peaks'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-67.png',
    alt: 'Rolling green hills'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-68.png',
    alt: 'Sunset landscape'
  }
]

const CarouselAuto = () => {
  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 2000
        })
      ]}
      className='w-full max-w-40 sm:max-w-xs'
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
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

export default CarouselAuto
