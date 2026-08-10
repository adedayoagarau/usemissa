import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const RadioGroupSolidDemo = () => {
  return (
    <RadioGroup defaultValue='light'>
      <div className='flex items-center gap-2'>
        <RadioGroupItem
          value='light'
          id='theme-light'
          className='data-checked:border-input data-checked:bg-primary-foreground dark:data-checked:bg-primary-foreground [&_[data-slot=radio-group-indicator]>span]:bg-primary'
        />
        <Label htmlFor='theme-light'>Light Theme</Label>
      </div>
      <div className='flex items-center gap-2'>
        <RadioGroupItem
          value='dark'
          id='theme-dark'
          className='data-checked:border-input data-checked:bg-primary-foreground dark:data-checked:bg-primary-foreground [&_[data-slot=radio-group-indicator]>span]:bg-primary'
        />
        <Label htmlFor='theme-dark'>Dark Theme</Label>
      </div>
      <div className='flex items-center gap-2'>
        <RadioGroupItem
          value='system'
          id='theme-system'
          className='data-checked:border-input data-checked:bg-primary-foreground dark:data-checked:bg-primary-foreground [&_[data-slot=radio-group-indicator]>span]:bg-primary'
        />
        <Label htmlFor='theme-system'>System Default</Label>
      </div>
    </RadioGroup>
  )
}

export default RadioGroupSolidDemo
