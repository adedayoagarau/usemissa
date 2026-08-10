'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import { ZoomOutIcon, ZoomInIcon } from "lucide-react"

const ButtonGroupZoomDemo = () => {
  const [zoom, setZoom] = useState(95)

  const handleZoomIn = () => {
    if (zoom < 100) {
      setZoom(zoom + 5)
    }
  }

  const handleZoomOut = () => {
    if (zoom > 0) {
      setZoom(zoom - 5)
    }
  }

  return (
    <ButtonGroup>
      <Button variant='outline' size='icon' onClick={handleZoomOut} disabled={zoom === 0}>
        <ZoomOutIcon
        />
        <span className='sr-only'>Zoom out</span>
      </Button>
      <ButtonGroupText className='bg-background dark:border-input dark:bg-input/30'>{`${zoom}%`}</ButtonGroupText>
      <Button variant='outline' size='icon' onClick={handleZoomIn} disabled={zoom === 100}>
        <ZoomInIcon
        />
        <span className='sr-only'>Zoom in</span>
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupZoomDemo
