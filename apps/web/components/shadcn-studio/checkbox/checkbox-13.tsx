import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const CheckboxCardDemo = () => {
  return (
    <div className='space-y-2'>
      <Label className='hover:bg-accent/50 flex items-start gap-2 rounded-lg border p-3 has-aria-checked:border-information has-aria-checked:bg-information dark:has-aria-checked:border-information dark:has-aria-checked:bg-information'>
        <Checkbox
          defaultChecked
          className='data-checked:border-information data-checked:bg-information data-checked:text-white dark:data-checked:border-information dark:data-checked:bg-information'
        />
        <div className='grid gap-1.5 font-normal'>
          <p className='text-sm leading-none font-medium'>Auto Start</p>
          <p className='text-muted-foreground text-sm'>Starting with your OS.</p>
        </div>
      </Label>
      <Label className='hover:bg-accent/50 flex items-start gap-2 rounded-lg border p-3 has-aria-checked:border-information has-aria-checked:bg-information dark:has-aria-checked:border-information dark:has-aria-checked:bg-information'>
        <Checkbox className='data-checked:border-information data-checked:bg-information data-checked:text-white dark:data-checked:border-information dark:data-checked:bg-information' />
        <div className='grid gap-1.5 font-normal'>
          <p className='text-sm leading-none font-medium'>Auto update</p>
          <p className='text-muted-foreground text-sm'>Download and install new version</p>
        </div>
      </Label>
    </div>
  )
}

export default CheckboxCardDemo
