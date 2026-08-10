import { Checkbox } from '@/components/ui/checkbox'

const CheckboxColorsDemo = () => {
  return (
    <div className='flex items-center gap-2'>
      <Checkbox
        className='focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 data-checked:border-destructive! data-checked:bg-destructive dark:data-checked:bg-destructive dark:text-white'
        aria-label='Color destructive'
        defaultChecked
      />
      <Checkbox
        className='focus-visible:ring-sky-600/20 data-checked:border-sky-600! data-checked:bg-sky-600 dark:text-white dark:focus-visible:ring-sky-400/40 dark:data-checked:border-sky-400! dark:data-checked:bg-sky-400'
        aria-label='Color info'
        defaultChecked
      />
      <Checkbox
        className='focus-visible:ring-green-600/20 data-checked:border-green-600! data-checked:bg-green-600 dark:text-white dark:focus-visible:ring-green-400/40 dark:data-checked:border-green-400! dark:data-checked:bg-green-400'
        aria-label='Color success'
        defaultChecked
      />
    </div>
  )
}

export default CheckboxColorsDemo
