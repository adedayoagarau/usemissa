import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ExternalLinkIcon } from "lucide-react"

const ButtonGroupPreviewDemo = () => {
  return (
    <ButtonGroup>
      <Button variant='outline' render={<a href='#' />} nativeButton={false}>
        Live preview
      </Button>
      <Button variant='outline' size='icon' render={<a href='#' rel='noopener noreferrer' />} nativeButton={false}>
        <ExternalLinkIcon
        />
        <span className='sr-only'>External link</span>
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupPreviewDemo
