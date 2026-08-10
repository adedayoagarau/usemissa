import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { SearchIcon, MicIcon } from "lucide-react"

const InputSearchIconDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Search input with icon and button</Label>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon className='size-4' />
          <span className='sr-only'>Search</span>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type='search'
          placeholder='Search...'
          className='[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none'
        />
        <InputGroupAddon align='inline-end'>
          <Button variant='ghost' size='icon' className='text-muted-foreground hover:bg-transparent'>
            <MicIcon
            />
            <span className='sr-only'>Press to speak</span>
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputSearchIconDemo
