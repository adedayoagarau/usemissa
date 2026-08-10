import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import ThumbsUp from '@/assets/svg/thumbs-up'
import ThumbsDown from '@/assets/svg/thumbs-down'

const ToggleGroupReview = () => {
  return (
    <ToggleGroup variant='outline' className='rounded-md shadow-xs' spacing={0}>
      <ToggleGroupItem
        value='like'
        className='group w-20 justify-start gap-3 overflow-hidden rounded-none rounded-l-md shadow-none transition-all duration-200 not-hover:w-8 hover:bg-sky-500/10 hover:text-sky-500 focus-visible:z-10 aria-pressed:bg-sky-600/10 dark:hover:bg-sky-400/10 dark:hover:text-sky-400 dark:aria-pressed:bg-sky-400/10'
      >
        <ThumbsUp className='group-aria-pressed/toggle:fill-sky-600 group-aria-pressed/toggle:stroke-sky-600 group-aria-pressed/toggle:text-sky-600 dark:group-aria-pressed/toggle:fill-sky-400 dark:group-aria-pressed/toggle:stroke-sky-400 dark:group-aria-pressed/toggle:text-sky-400' />
        Like
      </ToggleGroupItem>
      <ToggleGroupItem
        value='dislike'
        className='group hover:bg-destructive/10! hover:text-destructive aria-pressed:bg-destructive/10 w-24.5 justify-end gap-3 overflow-hidden rounded-none rounded-r-md shadow-none transition-all duration-200 not-hover:w-8 focus-visible:z-10'
      >
        Dislike
        <ThumbsDown className='group-aria-pressed/toggle:fill-destructive group-aria-pressed/toggle:stroke-destructive group-aria-pressed/toggle:text-destructive' />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default ToggleGroupReview
