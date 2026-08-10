import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckIcon, Link2Icon, ClockIcon } from "lucide-react"

const SeparatorVerticalText2Demo = () => {
  return (
    <div className='flex h-72 w-full max-w-sm items-center justify-around'>
      {/* 1. User Avatar */}
      <div className='flex h-full flex-col items-center gap-4'>
        <Separator orientation='vertical' className='mx-auto flex-1' />
        <Avatar className='after:border-none'>
          <AvatarFallback className='bg-primary text-primary-foreground text-sm'>JD</AvatarFallback>
        </Avatar>
        <Separator orientation='vertical' className='mx-auto flex-1' />
      </div>

      {/* 2. Success Status */}
      <div className='flex h-full flex-col items-center gap-4'>
        <Separator orientation='vertical' className='mx-auto flex-1' />
        <Avatar className='after:border-none'>
          <AvatarFallback className='bg-emerald-600/20 text-emerald-600'>
            <CheckIcon className='size-4' />
          </AvatarFallback>
        </Avatar>
        <Separator orientation='vertical' className='mx-auto flex-1' />
      </div>

      {/* 3. Connection Link */}
      <div className='flex h-full flex-col items-center gap-4'>
        <Separator
          orientation='vertical'
          className='border-border mx-auto flex-1 border-l-2 border-dotted bg-transparent'
        />
        <Button size='icon' variant='outline'>
          <Link2Icon className='size-4' />
        </Button>
        <Separator
          orientation='vertical'
          className='border-border mx-auto flex-1 border-l-2 border-dotted bg-transparent'
        />
      </div>

      {/* 4. Time Marker */}
      <div className='flex h-full flex-col items-center gap-4'>
        <Separator
          orientation='vertical'
          className='border-border mx-auto flex-1 border-l-2 border-dashed bg-transparent'
        />
        <Button variant='outline'>
          <ClockIcon className='size-3.5' />
          10:00
        </Button>
        <Separator
          orientation='vertical'
          className='border-border mx-auto flex-1 border-l-2 border-dashed bg-transparent'
        />
      </div>
    </div>
  )
}

export default SeparatorVerticalText2Demo
