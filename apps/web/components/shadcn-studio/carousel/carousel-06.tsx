'use client'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

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

const CarouselAuto = () => {
  return (
    <Carousel
      opts={{
        align: 'center',
        loop: true
      }}
      className='w-full max-w-xs'
    >
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index} className='basis-[70%]'>
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
