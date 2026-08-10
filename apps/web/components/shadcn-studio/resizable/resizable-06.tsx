import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizableHandleScale = () => {
  return (
    <ResizablePanelGroup orientation='horizontal' className='min-h-50 rounded-2xl border'>
      <ResizablePanel defaultSize='35%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='text-sm font-semibold'>Resize it</span>
        </div>
      </ResizablePanel>
      <ResizableHandle className='before:bg-border hover:before:bg-border active:bg-primary/20 active:before:bg-primary transition-colors duration-200 before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-10 before:h-6 before:w-1 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:transition-all before:duration-300 before:ease-[cubic-bezier(0.32,0.72,0,1)] hover:before:h-10 hover:before:w-1.5 active:before:h-20 active:before:w-1.5' />
      <ResizablePanel defaultSize='65%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='text-sm font-semibold'>to scale handle</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizableHandleScale
