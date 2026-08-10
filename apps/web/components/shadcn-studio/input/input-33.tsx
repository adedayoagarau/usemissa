import { useId } from 'react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const InputEndButtonDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with end button</Label>
      <ButtonGroup className='w-full'>
        <Input id={id} type='email' placeholder='Email address' />
        <Button>Subscribe</Button>
      </ButtonGroup>
    </div>
  )
}

export default InputEndButtonDemo
