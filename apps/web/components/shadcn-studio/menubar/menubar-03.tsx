'use client'

import { useState } from 'react'

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger
} from '@/components/ui/menubar'

const MenuBarRadioDemo = () => {
  const [playbackMode, setPlaybackMode] = useState('shuffle')
  const [genre, setGenre] = useState('rock')

  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='text-muted-foreground text-sm font-medium'>Radio Variant - Music Player</div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Playback</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={playbackMode} onValueChange={setPlaybackMode}>
              <MenubarRadioItem value='sequential'>Sequential</MenubarRadioItem>
              <MenubarRadioItem value='shuffle'>Shuffle</MenubarRadioItem>
              <MenubarRadioItem value='repeat'>Repeat</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Play</MenubarItem>
            <MenubarItem inset>Pause</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Genre</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={genre} onValueChange={setGenre}>
              <MenubarRadioItem value='rock'>Rock</MenubarRadioItem>
              <MenubarRadioItem value='jazz'>Jazz</MenubarRadioItem>
              <MenubarRadioItem value='classical'>Classical</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

export default MenuBarRadioDemo
