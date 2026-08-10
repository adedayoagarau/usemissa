import { useId } from 'react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const InputEndAddOnDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with end add-on</Label>
      <ButtonGroup>
        <Input id={id} placeholder='shadcnstudio.com' />
        <Button variant='outline'>.com</Button>
      </ButtonGroup>
    </div>
  )
}

export default InputEndAddOnDemo
