import { useId } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

const InputEndTextAddOnDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with end text add-on</Label>
      <InputGroup className='max-w-xs'>
        <InputGroupInput id={id} placeholder='shadcnstudio' />
        <InputGroupAddon align='inline-end' className='text-foreground font-normal'>
          .com
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputEndTextAddOnDemo
