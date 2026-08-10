import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizableMultiple = () => {
  return (
    <ResizablePanelGroup orientation='horizontal' className='min-h-50 rounded-2xl border'>
      <ResizablePanel defaultSize={25} minSize={15}>
        <div className='flex border-b p-2'>
          <span className='text-sm font-medium italic'>page.tsx</span>
        </div>
        <p className='p-2 text-sm'>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Alias iste quia accusamus sapiente autem enim?
        </p>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50} minSize={25}>
        <div className='flex border-b p-2'>
          <span className='text-sm font-medium italic'>resizable-07.tsx</span>
        </div>
        <p className='p-2 text-sm'>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Alias iste quia accusamus sapiente autem enim?
        </p>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={25} minSize={15}>
        <div className='flex border-b p-2'>
          <span className='text-sm font-medium italic'>layout.tsx</span>
        </div>
        <p className='p-2 text-sm'>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Alias iste quia accusamus sapiente autem enim?
        </p>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizableMultiple
