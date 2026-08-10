import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { ArrowUpIcon } from "lucide-react"

const SpinnerInputDemo = () => {
  return (
    <div className='flex w-full max-w-md flex-col gap-2'>
      {/* Input with spinner */}
      <InputGroup>
        <InputGroupInput placeholder='Send a message...' />
        <InputGroupAddon align='inline-end'>
          <Spinner className='size-4' />
        </InputGroupAddon>
      </InputGroup>

      {/* Textarea with spinner */}
      <InputGroup>
        <InputGroupTextarea placeholder='Send a message...' />
        <InputGroupAddon align='block-end'>
          <InputGroupButton className='ml-auto' variant='default' size='icon-sm'>
            <ArrowUpIcon
            />
            <span className='sr-only'>Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Spinner className='size-4' />
        Validating...
      </div>
    </div>
  )
}

export default SpinnerInputDemo
