import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { FilmIcon } from "lucide-react"

const NativeSelectWithIconDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Native select with icon</Label>
      <div className='group relative'>
        <NativeSelect id={id} className='*:data-[slot=native-select]:pl-9' defaultValue=''>
          <NativeSelectOption value='' disabled>
            Pick your favorite movie
          </NativeSelectOption>
          <NativeSelectOption value='1'>Godfather</NativeSelectOption>
          <NativeSelectOption value='2'>A Working Man</NativeSelectOption>
          <NativeSelectOption value='3'>The Dark Knight</NativeSelectOption>
          <NativeSelectOption value='4'>Inception</NativeSelectOption>
        </NativeSelect>
        <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 group-has-[select[disabled]]:opacity-50'>
          <FilmIcon size={16} aria-hidden='true' />
        </div>
      </div>
    </div>
  )
}

export default NativeSelectWithIconDemo
