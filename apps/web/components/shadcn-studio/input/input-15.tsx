import { useId } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { MailIcon } from "lucide-react"

const InputEndIconDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with end icon</Label>
      <InputGroup>
        <InputGroupInput id={id} placeholder='Email address' />
        <InputGroupAddon align='inline-end'>
          <MailIcon className='size-4' />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputEndIconDemo
