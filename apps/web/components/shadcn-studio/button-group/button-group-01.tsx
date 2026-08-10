import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { DownloadIcon } from "lucide-react"

const ButtonGroupDownloadDemo = () => {
  return (
    <ButtonGroup>
      <Button variant='outline'>
        <DownloadIcon
        />
        Download
      </Button>
      <Button variant='outline'>15K</Button>
    </ButtonGroup>
  )
}

export default ButtonGroupDownloadDemo
