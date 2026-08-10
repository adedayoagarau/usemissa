'use client'

import { useState } from 'react'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const ResizablePattern = () => {
  const [sizes, setSizes] = useState<Record<string, number>>({
    left: 65,
    right: 35
  })

  return (
    <ResizablePanelGroup
      orientation='horizontal'
      className='min-h-50 rounded-2xl border'
      onLayoutChange={layout => {
        setSizes(layout)
      }}
    >
      <ResizablePanel id='left' defaultSize={65} minSize={30}>
        <div className='flex h-full flex-col items-center justify-center gap-2 p-6'>
          <span className='text-sm font-semibold'>{Math.round(sizes.left ?? 65)}%</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id='right' defaultSize={35} minSize={20}>
        <div className='flex h-full flex-col items-center justify-center gap-2 p-6'>
          <span className='text-sm font-semibold'>{Math.round(sizes.right ?? 35)}%</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default ResizablePattern
