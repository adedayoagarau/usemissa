'use client'

import { useState } from 'react'

import { Switch } from '@/components/ui/switch'

const SwitchSquarePermanentIndicatorDemo = () => {
  const [checked, setChecked] = useState<boolean>(true)

  return (
    <div>
      <div className='relative inline-grid h-8 grid-cols-[1fr_1fr] items-center text-sm font-medium'>
        <Switch
          checked={checked}
          onCheckedChange={setChecked}
          className='peer data-unchecked:bg-input/50 absolute inset-0 rounded-md data-[size=default]:h-[inherit] data-[size=default]:w-auto [&_span]:z-10 [&_span]:rounded-sm [&_span]:transition-transform [&_span]:duration-300 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:group-data-[size=default]/switch:h-full [&_span]:group-data-[size=default]/switch:w-1/2 [&_span]:data-checked:translate-x-8.75 [&_span]:data-checked:rtl:-translate-x-8.75'
          aria-label='Square switch with permanent text indicators'
        />
        <span className='pointer-events-none relative ml-0.5 flex items-center justify-center px-2 text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-checked:invisible peer-data-unchecked:translate-x-full peer-data-unchecked:rtl:-translate-x-full'>
          <span className='text-[10px] font-medium uppercase'>No</span>
        </span>
        <span className='peer-data-checked:text-background pointer-events-none relative mr-0.5 flex items-center justify-center px-2 text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-checked:-translate-x-full peer-data-unchecked:invisible peer-data-checked:rtl:translate-x-full'>
          <span className='text-[10px] font-medium uppercase'>Yes</span>
        </span>
      </div>
    </div>
  )
}

export default SwitchSquarePermanentIndicatorDemo
