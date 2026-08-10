import { useId } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { UserIcon } from "lucide-react"

const InputStartIconDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with start icon</Label>
      <InputGroup className='max-w-xs'>
        <InputGroupAddon>
          <UserIcon className='size-4' />
        </InputGroupAddon>
        <InputGroupInput id={id} placeholder='Username' />
      </InputGroup>
    </div>
  )
}

export default InputStartIconDemo
