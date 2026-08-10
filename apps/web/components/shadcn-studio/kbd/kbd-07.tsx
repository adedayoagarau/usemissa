import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { SaveIcon, SearchIcon, CommandIcon, Code2Icon, PlayIcon } from "lucide-react"

const KbdShortCutsDemo = () => {
  return (
    <div className='flex flex-col items-start gap-6'>
      <h3 className='text-sm font-medium'>Top Shortcuts</h3>

      <div className='flex w-full max-w-md flex-col gap-4'>
        <div className='flex items-center gap-3'>
          <SaveIcon className='text-muted-foreground size-5' />
          <div className='flex-1'>
            <div className='text-sm font-medium'>Save</div>
            <div className='text-muted-foreground text-xs'>Save the current file</div>
          </div>
          <KbdGroup className='bg-muted rounded-md border p-1 shadow-xs'>
            <Kbd>Ctrl</Kbd>
            <span className='text-muted-foreground mx-1 text-sm'>+</span>
            <Kbd>S</Kbd>
          </KbdGroup>
        </div>

        <div className='flex items-center gap-3'>
          <SearchIcon className='text-muted-foreground size-5' />
          <div className='flex-1'>
            <div className='text-sm font-medium'>Find</div>
            <div className='text-muted-foreground text-xs'>Search across files</div>
          </div>
          <KbdGroup className='bg-muted rounded-md border p-1 shadow-xs'>
            <Kbd>Ctrl</Kbd>
            <span className='text-muted-foreground mx-1 text-sm'>+</span>
            <Kbd>K</Kbd>
          </KbdGroup>
        </div>

        <div className='flex items-center gap-3'>
          <CommandIcon className='text-muted-foreground size-5' />
          <div className='flex-1'>
            <div className='text-sm font-medium'>Command Palette</div>
            <div className='text-muted-foreground text-xs'>Open commands & actions</div>
          </div>
          <KbdGroup className='bg-muted rounded-md border p-1 shadow-xs'>
            <Kbd>Ctrl</Kbd>
            <span className='text-muted-foreground mx-1 text-sm'>+</span>
            <Kbd>Shift</Kbd>
            <span className='text-muted-foreground mx-1 text-sm'>+</span>
            <Kbd>P</Kbd>
          </KbdGroup>
        </div>
      </div>

      <div className='flex items-center gap-3 max-sm:mt-1.5 max-sm:items-start'>
        <div className='text-sm font-medium text-nowrap'>Quick Actions</div>
        <div className='ml-auto flex gap-2 max-sm:flex-wrap max-sm:items-start'>
          <div className='bg-card flex items-center gap-1 rounded-md border px-2 py-1 shadow-xs'>
            <Code2Icon className='text-muted-foreground size-4' />
            <KbdGroup>
              <Kbd>Shift</Kbd>
              <span className='mx-1'>+</span>
              <Kbd>Alt</Kbd>
              <span className='mx-1'>+</span>
              <Kbd>F</Kbd>
            </KbdGroup>
          </div>
          <div className='bg-card flex items-center gap-1 rounded-md border px-2 py-1 shadow-xs'>
            <PlayIcon className='text-muted-foreground size-4' />
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <span className='mx-1'>+</span>
              <Kbd>R</Kbd>
            </KbdGroup>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KbdShortCutsDemo
