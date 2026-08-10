import { useId } from 'react'

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectWithInsetLabelDemo = () => {
  const id = useId()

  return (
    <div className='border-input bg-background focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 relative w-full max-w-xs rounded-lg border ring-1 ring-transparent transition-colors outline-none focus-within:ring-3 has-aria-invalid:ring-3 has-[select:disabled]:cursor-not-allowed has-[select:disabled]:opacity-50 has-[select:is(:disabled)_*]:pointer-events-none'>
      <label htmlFor={id} className='text-foreground block px-2.5 pt-1 text-xs font-medium'>
        Native select with inset label
      </label>
      <NativeSelect
        id={id}
        defaultValue=''
        className='w-full *:data-[slot=native-select]:border-none *:data-[slot=native-select]:focus-visible:ring-0 dark:*:data-[slot=native-select]:bg-transparent'
      >
        <NativeSelectOption value='' disabled>
          Pick your favorite movie
        </NativeSelectOption>
        <NativeSelectOption value='1'>Interstellar</NativeSelectOption>
        <NativeSelectOption value='2'>Dune</NativeSelectOption>
        <NativeSelectOption value='3'>The Matrix</NativeSelectOption>
        <NativeSelectOption value='4'>Catch Me If You Can</NativeSelectOption>
      </NativeSelect>
    </div>
  )
}

export default NativeSelectWithInsetLabelDemo
