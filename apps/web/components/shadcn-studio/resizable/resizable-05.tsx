import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizableHandleDemo = () => {
  return (
    <ResizablePanelGroup orientation='horizontal' className='min-h-50 max-w-md rounded-lg border md:min-w-112.5'>
      <ResizablePanel defaultSize='25%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Sidebar</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize='75%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Content</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizableHandleDemo
