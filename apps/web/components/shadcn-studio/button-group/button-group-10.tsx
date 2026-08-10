import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { FlipHorizontalIcon, FlipVerticalIcon } from "lucide-react"

const ButtonGroupDemo = () => {
  return (
    <ButtonGroup className='*:border-primary *:not-last:border-r-primary-foreground/30 *:bg-clip-border'>
      <Button size='icon'>
        <FlipHorizontalIcon
        />
        <span className='sr-only'>Flip Horizontal</span>
      </Button>
      <Button size='icon'>
        <FlipVerticalIcon
        />
        <span className='sr-only'>Flip Vertical</span>
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupDemo
