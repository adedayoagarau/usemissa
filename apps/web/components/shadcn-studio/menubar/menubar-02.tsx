'use client'

import { useState } from 'react'

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from '@/components/ui/menubar'

const MenuBarCheckBoxDemo = () => {
  const [timeline, setTimeline] = useState(true)
  const [audioWaveform, setAudioWaveform] = useState(false)
  const [blur, setBlur] = useState(false)
  const [sepia, setSepia] = useState(true)
  const [vintage, setVintage] = useState(false)

  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='text-muted-foreground text-sm font-medium'>Checkbox Variant</div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent className='w-auto'>
            <MenubarCheckboxItem checked={timeline} onCheckedChange={setTimeline}>
              Show Timeline
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={audioWaveform} onCheckedChange={setAudioWaveform}>
              Show Audio Waveform
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Zoom In <MenubarShortcut>⌘+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Zoom Out <MenubarShortcut>⌘-</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Effects</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={blur} onCheckedChange={setBlur}>
              Blur
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={sepia} onCheckedChange={setSepia}>
              Sepia
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={vintage} onCheckedChange={setVintage}>
              Vintage
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

export default MenuBarCheckBoxDemo
