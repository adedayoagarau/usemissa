'use client'

import { useEffect, useId, useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { SearchIcon, LoaderCircleIcon } from "lucide-react"

const InputSearchLoaderDemo = () => {
  const [value, setValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const id = useId()

  useEffect(() => {
    if (value) {
      // The loading indicator intentionally starts when the search value changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true)

      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 500)

      return () => clearTimeout(timer)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(false)
  }, [value])

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Search input with loader</Label>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon className='size-4' />
          <span className='sr-only'>Search</span>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type='search'
          placeholder='Search...'
          value={value}
          onChange={e => setValue(e.target.value)}
          className='[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none'
        />
        <InputGroupAddon align='inline-end' className='text-muted-foreground pointer-events-none'>
          {isLoading && (
            <>
              <LoaderCircleIcon className='size-4 animate-spin' />
              <span className='sr-only'>Loading...</span>
            </>
          )}
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputSearchLoaderDemo
