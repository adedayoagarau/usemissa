import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizableVertical = () => {
  return (
    <ResizablePanelGroup orientation='vertical' className='min-h-80 max-w-sm rounded-lg border'>
      <ResizablePanel defaultSize='25%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Header</span>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize='75%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Content</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizableVertical
