import { useId } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'

const InputSearchDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Search input with &lt;kbd&gt;</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type='search'
          placeholder='Search...'
          className='[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none'
        />
        <InputGroupAddon align='inline-end'>
          <Kbd>⌘k</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputSearchDemo
