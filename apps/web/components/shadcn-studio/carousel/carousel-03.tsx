'use client'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

const Images = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-18.png',
    alt: 'Denta'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-19.png',
    alt: 'Eduweks'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-20.png',
    alt: 'Sicio'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-21.png',
    alt: 'Uidino'
  }
]

const CarouselOrientation = () => {
  return (
    <Carousel
      opts={{
        align: 'center'
      }}
      orientation='vertical'
      className='mt-5 w-full max-w-xs'
    >
      <CarouselContent className='-mt-1 h-60.5'>
        {Images.map((image, index) => (
          <CarouselItem key={index} className='basis-1/2 pt-1'>
            <div className='p-1'>
              <img src={image.image} alt={image.alt} className='h-35 w-full rounded-md object-cover' />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className='from-background pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-linear-to-b to-transparent' />
      <div className='from-background pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-linear-to-t to-transparent' />
      <CarouselPrevious className='z-20' />
      <CarouselNext className='z-20' />
    </Carousel>
  )
}

export default CarouselOrientation
