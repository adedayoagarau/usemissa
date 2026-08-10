import { useId } from 'react'

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectWithOverlappingLabelDemo = () => {
  const id = useId()

  return (
    <div className='group relative w-full max-w-xs'>
      <label
        htmlFor={id}
        className='bg-background text-foreground absolute top-0 left-2 z-10 block -translate-y-1/2 px-1 text-xs font-medium group-has-[select:disabled]:opacity-50'
      >
        Native select with overlapping label
      </label>
      <NativeSelect id={id} className='w-full'>
        <NativeSelectOption value='1'>Developer</NativeSelectOption>
        <NativeSelectOption value='2'>Designer</NativeSelectOption>
        <NativeSelectOption value='3'>Manager</NativeSelectOption>
        <NativeSelectOption value='4'>QA Engineer</NativeSelectOption>
      </NativeSelect>
    </div>
  )
}

export default NativeSelectWithOverlappingLabelDemo
