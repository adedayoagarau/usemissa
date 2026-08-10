import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const RadioGroupColorsDemo = () => {
  return (
    <RadioGroup defaultValue='destructive' className='flex items-center gap-4'>
      <div className='flex items-center gap-2'>
        <RadioGroupItem
          value='destructive'
          id='color-destructive'
          className='border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 data-checked:border-destructive data-checked:bg-destructive dark:data-checked:border-destructive dark:data-checked:bg-destructive'
        />
        <Label htmlFor='color-destructive'>Destructive</Label>
      </div>
      <div className='flex items-center gap-2'>
        <RadioGroupItem
          value='success'
          id='color-success'
          className='border-green-600 focus-visible:border-green-600 focus-visible:ring-green-600/20 data-checked:border-green-600 data-checked:bg-green-600 dark:border-green-400 dark:focus-visible:ring-green-600/40 dark:data-checked:border-green-400 dark:data-checked:bg-green-400'
        />
        <Label htmlFor='color-success'>Success</Label>
      </div>
      <div className='flex items-center gap-2'>
        <RadioGroupItem
          value='info'
          id='color-info'
          className='border-sky-600 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 data-checked:border-sky-600 data-checked:bg-sky-600 dark:border-sky-400 dark:focus-visible:ring-sky-600/40 dark:data-checked:border-sky-400 dark:data-checked:bg-sky-400'
        />
        <Label htmlFor='color-info'>Info</Label>
      </div>
    </RadioGroup>
  )
}

export default RadioGroupColorsDemo
