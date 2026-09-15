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
          <StarIcon className='fill-warning stroke-warning stroke-1 text-warning dark:fill-warning dark:stroke-warning dark:text-warning' />
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
          <CircleIcon className='fill-success stroke-success stroke-1 text-success dark:fill-success dark:stroke-success dark:text-success' />
        </span>
      </CheckboxPrimitive.Root>
    </div>
  )
}

export default CheckboxCustomIconsDemo
