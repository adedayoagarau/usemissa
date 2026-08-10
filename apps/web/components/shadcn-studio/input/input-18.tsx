import { useId } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

const InputTextAddOnsDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with text add-ons</Label>
      <InputGroup className='max-w-xs'>
        <InputGroupAddon className='text-foreground font-normal'>https://</InputGroupAddon>
        <InputGroupInput id={id} placeholder='shadcnstudio' />
        <InputGroupAddon align='inline-end' className='text-foreground font-normal'>
          .com
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputTextAddOnsDemo
