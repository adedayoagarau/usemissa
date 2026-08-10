import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizableBento = () => {
  return (
    <ResizablePanelGroup orientation='vertical' className='min-h-80 rounded-2xl border'>
      {/* Row 1: Three equal panels */}
      <ResizablePanel defaultSize={33}>
        <ResizablePanelGroup orientation='horizontal'>
          <ResizablePanel defaultSize={33}>
            <div className='h-full w-full overflow-hidden'>
              <img
                src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-9.png'
                alt='Placeholder'
                className='h-full w-full object-cover'
              />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={34}>
            <div className='h-full w-full overflow-hidden'>
              <img
                src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-8.png'
                alt='Placeholder'
                className='h-full w-full object-cover'
              />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={33}>
            <div className='h-full w-full overflow-hidden'>
              <img
                src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-4.png'
                alt='Placeholder'
                className='h-full w-full object-cover'
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      {/* Row 2: Small | Wide */}
      <ResizablePanel defaultSize={34}>
        <ResizablePanelGroup orientation='horizontal'>
          <ResizablePanel defaultSize={45}>
            <div className='h-full w-full overflow-hidden'>
              <img
                src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-21.png'
                alt='Placeholder'
                className='h-full w-full object-cover'
              />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={55}>
            <div className='h-full w-full overflow-hidden'>
              <img
                src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-20.png'
                alt='Placeholder'
                className='h-full w-full object-cover'
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      {/* Row 3: Full width */}
      <ResizablePanel defaultSize={33}>
        <div className='h-full w-full overflow-hidden'>
          <img
            src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-10.png'
            alt='Placeholder'
            className='h-full w-full object-cover'
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizableBento
