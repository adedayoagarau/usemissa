import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react"

const ButtonGroupRevealDemo = () => {
  return (
    <ButtonGroup>
      <Button
        variant='outline'
        className='group w-20 justify-start gap-3 overflow-hidden transition-all duration-200 not-hover:w-10 hover:bg-sky-500/10 hover:text-sky-500 dark:hover:bg-sky-400/10 dark:hover:text-sky-400'
      >
        <ThumbsUpIcon
        />
        Like
      </Button>
      <Button
        variant='outline'
        className='group hover:bg-destructive/10! hover:text-destructive w-24.5 justify-end gap-3 overflow-hidden shadow-none transition-all duration-200 not-hover:w-10'
      >
        Dislike
        <ThumbsDownIcon
        />
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupRevealDemo
