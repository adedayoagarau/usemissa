import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CircleCheckIcon } from "lucide-react"

const CheckboxFilledIconDemo = () => {
  return (
    <div className='flex items-center gap-2'>
      <CheckboxPrimitive.Root
        data-slot='checkbox'
        defaultChecked
        className='peer bg-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 data-checked:text-destructive size-7 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3'
        aria-label='Color destructive'
      >
        <CheckboxPrimitive.Indicator
          data-slot='checkbox-indicator'
          className='flex h-full items-center justify-center text-current transition-none'
        >
          <CircleCheckIcon className='size-5.5 fill-white stroke-current' />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <CheckboxPrimitive.Root
        data-slot='checkbox'
        defaultChecked
        className='peer size-7 shrink-0 rounded-full bg-sky-600 outline-none focus-visible:ring-3 focus-visible:ring-sky-600/20 data-checked:text-sky-600 dark:bg-sky-400 dark:focus-visible:ring-sky-400/40 dark:data-checked:text-sky-400'
        aria-label='Color info'
      >
        <CheckboxPrimitive.Indicator
          data-slot='checkbox-indicator'
          className='flex h-full items-center justify-center text-current transition-none'
        >
          <CircleCheckIcon className='size-5.5 fill-white stroke-current' />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <CheckboxPrimitive.Root
        data-slot='checkbox'
        defaultChecked
        className='peer size-7 shrink-0 rounded-full bg-green-600 outline-none focus-visible:ring-3 focus-visible:ring-green-600/20 data-checked:text-green-600 dark:bg-green-400 dark:focus-visible:ring-green-400/40 dark:data-checked:text-green-400'
        aria-label='Color success'
      >
        <CheckboxPrimitive.Indicator
          data-slot='checkbox-indicator'
          className='flex h-full items-center justify-center text-current transition-none'
        >
          <CircleCheckIcon className='size-5.5 fill-white stroke-current' />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    </div>
  )
}

export default CheckboxFilledIconDemo
