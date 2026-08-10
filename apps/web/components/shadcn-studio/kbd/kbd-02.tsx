import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { PlusIcon } from "lucide-react"

const KbdChordDemo = () => {
  return (
    <div className='flex flex-col items-start gap-4'>
      <p className='text-sm font-medium'>Chord Shortcuts</p>
      <div className='flex flex-col gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Keyboard Shortcuts</span>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-4'>
            <KbdGroup className='bg-muted rounded-sm border p-1 shadow-xs'>
              <span className='flex items-center gap-1'>
                <Kbd className='bg-transparent'>Ctrl</Kbd>
                <span className='text-muted-foreground text-sm'>+</span>
                <Kbd className='bg-transparent'>K</Kbd>
              </span>
            </KbdGroup>
          </div>
          <div className='flex items-center gap-4'>
            <PlusIcon className='text-muted-foreground size-4' />
            <KbdGroup className='bg-muted rounded-sm border p-1 shadow-xs'>
              <span className='flex items-center gap-1'>
                <Kbd className='bg-transparent'>Ctrl</Kbd>
                <span className='text-muted-foreground text-sm'>+</span>
                <Kbd className='bg-transparent'>S</Kbd>
              </span>
            </KbdGroup>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Close Editor</span>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-4'>
            <KbdGroup className='bg-muted rounded-sm border p-1 shadow-xs'>
              <span className='flex items-center gap-1'>
                <Kbd className='bg-transparent'>Ctrl</Kbd>
                <span className='text-muted-foreground text-sm'>+</span>
                <Kbd className='bg-transparent'>K</Kbd>
              </span>
            </KbdGroup>
          </div>
          <div className='flex items-center gap-4'>
            <PlusIcon className='text-muted-foreground size-4' />
            <KbdGroup className='bg-muted rounded-sm border p-1 shadow-xs'>
              <span className='flex items-center gap-1'>
                <Kbd className='bg-transparent'>W</Kbd>
              </span>
            </KbdGroup>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Close All Editors</span>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-4'>
            <KbdGroup className='bg-muted rounded-sm border p-1 shadow-xs'>
              <span className='flex items-center gap-1'>
                <Kbd className='bg-transparent'>Ctrl</Kbd>
                <span className='text-muted-foreground text-sm'>+</span>
                <Kbd className='bg-transparent'>K</Kbd>
              </span>
            </KbdGroup>
          </div>
          <div className='flex items-center gap-4'>
            <PlusIcon className='text-muted-foreground size-4' />
            <KbdGroup className='bg-muted rounded-sm border p-1 shadow-xs'>
              <span className='flex items-center gap-1'>
                <Kbd className='bg-transparent'>Ctrl</Kbd>
                <span className='text-muted-foreground text-sm'>+</span>
                <Kbd className='bg-transparent'>W</Kbd>
              </span>
            </KbdGroup>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KbdChordDemo
