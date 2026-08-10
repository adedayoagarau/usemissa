import { Toggle } from '@/components/ui/toggle'
import Heart from '@/assets/svg/heart'
import ThumbsUp from '@/assets/svg/thumbs-up'
import { StarIcon, ArrowBigUpIcon } from "lucide-react"

const ToggleFilledIcon = () => {
  return (
    <div className='flex items-center gap-2'>
      <Toggle aria-label='Toggle heart' variant='outline'>
        <Heart className='group-data-[state=on]/toggle:fill-destructive group-data-[state=on]/toggle:stroke-destructive group-data-[state=on]/toggle:text-destructive' />
      </Toggle>
      <Toggle aria-label='Toggle thumbs up' variant='outline'>
        <ThumbsUp className='group-data-[state=on]/toggle:fill-sky-600 group-data-[state=on]/toggle:stroke-sky-600 group-data-[state=on]/toggle:text-sky-600 dark:group-data-[state=on]/toggle:fill-sky-400 dark:group-data-[state=on]/toggle:stroke-sky-400 dark:group-data-[state=on]/toggle:text-sky-400' />
      </Toggle>
      <Toggle aria-label='Toggle star' variant='outline'>
        <StarIcon className='group-data-[state=on]/toggle:fill-amber-600 group-data-[state=on]/toggle:stroke-amber-600 group-data-[state=on]/toggle:text-amber-600 dark:group-data-[state=on]/toggle:fill-amber-400 dark:group-data-[state=on]/toggle:stroke-amber-400 dark:group-data-[state=on]/toggle:text-amber-400' />
      </Toggle>
      <Toggle aria-label='Toggle arrow up' variant='outline'>
        <ArrowBigUpIcon className='group-data-[state=on]/toggle:fill-green-600 group-data-[state=on]/toggle:stroke-green-600 group-data-[state=on]/toggle:text-green-600 dark:group-data-[state=on]/toggle:fill-green-400 dark:group-data-[state=on]/toggle:stroke-green-400 dark:group-data-[state=on]/toggle:text-green-400' />
      </Toggle>
    </div>
  )
}

export default ToggleFilledIcon
