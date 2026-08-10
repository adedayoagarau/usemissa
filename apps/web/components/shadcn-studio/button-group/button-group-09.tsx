import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { SquarePenIcon, CopyIcon, Trash2Icon } from "lucide-react"

const ButtonGroupActionsDemo = () => {
  return (
    <ButtonGroup>
      <Button variant='outline'>
        <SquarePenIcon
        />
        Edit
      </Button>
      <Button variant='outline'>
        <CopyIcon
        />
        Duplicate
      </Button>
      <Button variant='outline'>
        <Trash2Icon
        />
        Delete
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupActionsDemo
