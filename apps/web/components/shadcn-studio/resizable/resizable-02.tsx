import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizableNoHandle = () => {
  return (
    <ResizablePanelGroup orientation='horizontal' className='min-h-75 rounded-2xl border'>
      <ResizablePanel defaultSize='50%'>
        <div className='flex h-50 items-center justify-center p-6'>
          <span className='font-semibold'>One</span>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize='50%'>
        <ResizablePanelGroup orientation='vertical'>
          <ResizablePanel defaultSize='25%'>
            <div className='flex h-full items-center justify-center p-6'>
              <span className='font-semibold'>Two</span>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize='75%'>
            <div className='flex h-full items-center justify-center p-6'>
              <span className='font-semibold'>Three</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizableNoHandle
