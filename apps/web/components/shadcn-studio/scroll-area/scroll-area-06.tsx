import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const images = [
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-38.png', alt: 'Gallery Image 1' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-39.png', alt: 'Gallery Image 2' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-40.png', alt: 'Gallery Image 3' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-41.png', alt: 'Gallery Image 4' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-42.png', alt: 'Gallery Image 5' }
]

const ScrollAreaGalleryDemo = () => {
  return (
    <div className='rounded-md border'>
      <ScrollArea className='relative h-auto w-full max-w-xs sm:max-w-md'>
        <h4 className='absolute top-3 left-4 text-sm font-medium'>Image Gallery</h4>
        <div className='mt-6 mb-2 p-4'>
          <div className='flex space-x-4'>
            {images.map((image, i) => (
              <img key={i} src={image.src} alt={image.alt} className='h-60 w-50 shrink-0 rounded-md shadow-sm' />
            ))}
            <div className='w-px shrink-0' />
          </div>
        </div>
        <ScrollBar orientation='horizontal' className='mx-4 my-2' />
      </ScrollArea>
    </div>
  )
}

export default ScrollAreaGalleryDemo
