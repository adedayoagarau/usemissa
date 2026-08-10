'use client'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-58.png',
    alt: 'Carousel Image'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-59.png',
    alt: 'Carousel Image'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-60.png',
    alt: 'Carousel Image'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-61.png',
    alt: 'Carousel Image'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-62.png',
    alt: 'Carousel Image'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-63.png',
    alt: 'Carousel Image'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-64.png',
    alt: 'Carousel Image'
  }
]

const CarouselView = () => {
  return (
    <Carousel
      opts={{
        align: 'start'
      }}
      className='w-full max-w-48 sm:max-w-xs md:max-w-sm'
    >
      <CarouselContent>
        {Images.map((image, index) => (
          <CarouselItem key={index} className='basis-1/2 lg:basis-1/3'>
            <div className='p-1'>
              <img src={image.image} alt={image.alt} className='w-auto rounded-md object-cover' />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

export default CarouselView
