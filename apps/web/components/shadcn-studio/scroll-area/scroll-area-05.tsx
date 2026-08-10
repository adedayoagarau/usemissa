import { ScrollArea } from '@/components/ui/scroll-area'

const images = [
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-38.png', alt: 'Gallery Image 1' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-39.png', alt: 'Gallery Image 2' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-40.png', alt: 'Gallery Image 3' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-41.png', alt: 'Gallery Image 4' },
  { src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-42.png', alt: 'Gallery Image 5' }
]

const ScrollAreaGalleryFadeDemo = () => {
  return (
    <div className='rounded-md border p-1 py-0'>
      <ScrollArea className='relative h-64 w-full max-w-md'>
        <div className='p-3 py-0'>
          <div className='my-3 flex flex-col gap-4'>
            {images.map((image, i) => (
              <img key={i} src={image.src} alt={image.alt} className='max-h-60 w-50 shrink-0 rounded-md shadow-sm' />
            ))}
          </div>
        </div>
        <div className='from-background pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-linear-to-b to-transparent' />
        <div className='from-background pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-linear-to-t to-transparent' />
      </ScrollArea>
    </div>
  )
}

export default ScrollAreaGalleryFadeDemo
