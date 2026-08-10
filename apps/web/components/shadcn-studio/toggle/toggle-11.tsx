'use client'

import { useState } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { VolumeOffIcon, Volume2Icon } from "lucide-react"

const ToggleIconText = () => {
  const [muted, setMuted] = useState(false)

  return (
    <div className='flex flex-wrap items-center justify-center'>
      <Toggle size='lg' variant='outline' aria-label='Toggle mute' pressed={muted} onPressedChange={setMuted}>
        {muted ? (
          <VolumeOffIcon
          />
        ) : (
          <Volume2Icon
          />
        )}
        {muted ? 'Muted' : 'Sound'}
      </Toggle>
    </div>
  )
}

export default ToggleIconText
