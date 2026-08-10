import { useId } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

const InputStartTextAddOnDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with start text add-on</Label>
      <InputGroup className='max-w-xs'>
        <InputGroupAddon className='text-foreground font-normal'>https://</InputGroupAddon>
        <InputGroupInput id={id} placeholder='shadcnstudio.com' />
      </InputGroup>
    </div>
  )
}

export default InputStartTextAddOnDemo
