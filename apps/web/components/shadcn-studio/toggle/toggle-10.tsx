'use client'

import { useState } from 'react'

import { Toggle } from '@/components/ui/toggle'

const ToggleText = () => {
  const [isRTL, setIsRTL] = useState(false)
  const [isOn, setIsOn] = useState(false)

  return (
    <div className='flex flex-wrap items-center justify-center gap-2'>
      <Toggle aria-label='rtl-ltr' onClick={() => setIsRTL(!isRTL)}>
        {isRTL ? 'RTL' : 'LTR'}
      </Toggle>
      <Toggle aria-label='on-off' onClick={() => setIsOn(!isOn)}>
        {isOn ? 'ON' : 'OFF'}
      </Toggle>
    </div>
  )
}

export default ToggleText
