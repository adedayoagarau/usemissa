import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectWithOptionGroupsDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Native select with option groups</Label>
      <NativeSelect id={id}>
        <NativeSelectOptGroup label='Frontend Technologies'>
          <NativeSelectOption value='1'>HTML</NativeSelectOption>
          <NativeSelectOption value='2'>CSS</NativeSelectOption>
          <NativeSelectOption value='3'>JavaScript</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label='Backend Technologies'>
          <NativeSelectOption value='4'>Node.js</NativeSelectOption>
          <NativeSelectOption value='5'>Python</NativeSelectOption>
          <NativeSelectOption value='6'>Java</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  )
}

export default NativeSelectWithOptionGroupsDemo
