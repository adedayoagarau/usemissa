import { Kbd } from '@/components/ui/kbd'
import { CircleArrowOutUpLeftIcon, ArrowRightToLineIcon, ArrowBigUpDashIcon, ArrowBigUpIcon, CornerDownLeftIcon, DeleteIcon, TrashIcon } from "lucide-react"

const KbdSpecialKeyDemo = () => {
  return (
    <div className='flex flex-col items-center gap-6'>
      {/* Function keys row */}
      <div className='w-full'>
        <span className='text-muted-foreground mb-2 block text-sm font-medium'>Function Keys</span>
        <div className='flex flex-wrap gap-2'>
          <div className='flex flex-col items-center'>
            <Kbd title='F1' className='h-8 w-8 border bg-transparent shadow-xs'>
              F1
            </Kbd>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='F2' className='h-8 w-8 border bg-transparent shadow-xs'>
              F2
            </Kbd>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='F3' className='h-8 w-8 border bg-transparent shadow-xs'>
              F3
            </Kbd>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='F4' className='h-8 w-8 border bg-transparent shadow-xs'>
              F4
            </Kbd>
          </div>
        </div>
      </div>

      {/* Special keys row (symbols) */}
      <div className='w-full'>
        <span className='text-muted-foreground mb-2 block text-sm font-medium'>Special Keys</span>
        <div className='flex flex-wrap gap-4'>
          <div className='flex flex-col items-center'>
            <Kbd title='Escape' className='h-8 w-8 border bg-transparent shadow-xs'>
              <CircleArrowOutUpLeftIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Esc</span>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='Tab' className='h-8 w-8 border bg-transparent shadow-xs'>
              <ArrowRightToLineIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Tab</span>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='Caps Lock' className='h-8 w-8 border bg-transparent shadow-xs'>
              <ArrowBigUpDashIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Caps</span>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='Shift' className='h-8 w-8 border bg-transparent shadow-xs'>
              <ArrowBigUpIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Shift</span>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='Enter' className='h-8 w-8 border bg-transparent shadow-xs'>
              <CornerDownLeftIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Enter</span>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='Backspace' className='h-8 w-8 border bg-transparent shadow-xs'>
              <DeleteIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Backspace</span>
          </div>
          <div className='flex flex-col items-center'>
            <Kbd title='Delete' className='h-8 w-8 border bg-transparent shadow-xs'>
              <TrashIcon className='size-4.5' />
            </Kbd>
            <span className='text-muted-foreground mt-1 text-xs font-medium'>Delete</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KbdSpecialKeyDemo
