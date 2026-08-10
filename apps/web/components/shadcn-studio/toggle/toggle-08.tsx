'use client'

import { useState } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { DiamondIcon, MicIcon, PauseIcon, PlayIcon, WifiOffIcon, WifiIcon, XIcon, MenuIcon } from "lucide-react"

const ToggleIcon = () => {
  const [isPlay, setIsPlay] = useState(false)
  const [isWifi, setIsWifi] = useState(false)
  const [isSpeak, setIsSpeak] = useState(false)
  const [isMenu, setIsMenu] = useState(false)

  return (
    <div className='flex flex-wrap items-center justify-center gap-2'>
      <Toggle variant='outline' aria-label='microphone toggle' onClick={() => setIsSpeak(!isSpeak)}>
        {isSpeak ? (
          <DiamondIcon className='fill-primary animate-spin' />
        ) : (
          <MicIcon
          />
        )}
      </Toggle>
      <Toggle variant='outline' aria-label='power toggle' onClick={() => setIsPlay(!isPlay)}>
        {isPlay ? (
          <PauseIcon
          />
        ) : (
          <PlayIcon
          />
        )}
      </Toggle>
      <Toggle variant='outline' aria-label='wifi toggle' onClick={() => setIsWifi(!isWifi)}>
        {isWifi ? (
          <WifiOffIcon
          />
        ) : (
          <WifiIcon
          />
        )}
      </Toggle>
      <Toggle variant='outline' aria-label='menu toggle' onClick={() => setIsMenu(!isMenu)}>
        {isMenu ? (
          <XIcon
          />
        ) : (
          <MenuIcon
          />
        )}
      </Toggle>
    </div>
  )
}

export default ToggleIcon
