import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { SendHorizonalIcon } from "lucide-react"

const InputEndInlineButtonDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with end inline button</Label>
      <InputGroup>
        <InputGroupInput id={id} placeholder='Email address' />
        <InputGroupAddon align='inline-end'>
          <Button
            variant='ghost'
            size='icon'
            className='text-muted-foreground focus-visible:ring-ring/50 rounded-l-none hover:bg-transparent'
          >
            <SendHorizonalIcon
            />
            <span className='sr-only'>Subscribe</span>
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputEndInlineButtonDemo
