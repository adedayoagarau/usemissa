import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { HeartIcon, StarIcon, CircleIcon } from "lucide-react"

const CheckboxCustomIconsDemo = () => {
  return (
    <div className='flex items-center gap-2'>
      <CheckboxPrimitive.Root
        data-slot='checkbox'
        defaultChecked
        className='focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3'
        aria-label='Heart icon'
      >
        <span className='in-data-checked:hidden'>
          <HeartIcon className='stroke-1' />
        </span>
        <span className='in-data-unchecked:hidden'>
          <HeartIcon className='fill-destructive stroke-destructive text-destructive stroke-1' />
        </span>
      </CheckboxPrimitive.Root>
      <CheckboxPrimitive.Root
        data-slot='checkbox'
        defaultChecked
        className='focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3'
        aria-label='Star icon'
      >
        <span className='in-data-checked:hidden'>
          <StarIcon className='stroke-1' />
        </span>
        <span className='in-data-unchecked:hidden'>
          <StarIcon className='fill-amber-500 stroke-amber-500 stroke-1 text-amber-500 dark:fill-amber-400 dark:stroke-amber-400 dark:text-amber-400' />
        </span>
      </CheckboxPrimitive.Root>
      <CheckboxPrimitive.Root
        data-slot='checkbox'
        defaultChecked
        className='focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3'
        aria-label='Circle icon'
      >
        <span className='in-data-checked:hidden'>
          <CircleIcon className='stroke-1' />
        </span>
        <span className='in-data-unchecked:hidden'>
          <CircleIcon className='fill-green-600 stroke-green-600 stroke-1 text-green-600 dark:fill-green-400 dark:stroke-green-400 dark:text-green-400' />
        </span>
      </CheckboxPrimitive.Root>
    </div>
  )
}

export default CheckboxCustomIconsDemo
