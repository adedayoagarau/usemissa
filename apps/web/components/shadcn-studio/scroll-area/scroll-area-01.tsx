import { ScrollArea } from '@/components/ui/scroll-area'

const ScrollAreaDemo = () => {
  return (
    <ScrollArea className='h-64 w-64 rounded-md border'>
      <div className='px-4 py-2'>
        <h4 className='mb-4 text-sm font-medium'>Scrollable Content</h4>
        <div className='text-sm leading-relaxed'>
          {Array.from({ length: 4 }, (_, i) => (
            <p key={i} className='mb-4'>
              Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
              laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit
              esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa
              qui officia deserunt mollit anim id est laborum.
            </p>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}

export default ScrollAreaDemo
