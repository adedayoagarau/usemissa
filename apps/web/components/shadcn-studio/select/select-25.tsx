import { useId } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Select payment method', value: null },
  { label: 'Credit Card', value: '1' },
  { label: 'Google Pay', value: '2' },
  { label: 'PayPal', value: '3' },
  { label: 'Bitcoin', value: '4' }
]

const SelectWithInsetLabelDemo = () => {
  const id = useId()

  return (
    <div className='group border-input bg-background focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 relative w-full max-w-xs rounded-lg border ring-1 ring-transparent transition-colors outline-none focus-within:ring-3 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-aria-invalid:ring-3'>
      <label
        htmlFor={id}
        className='text-foreground dark:bg-input/30 dark:group-hover:bg-input/50 block px-2.5 pt-1 text-xs font-medium'
      >
        Select with inset label
      </label>
      <Select items={items}>
        <SelectTrigger
          id={id}
          className='dark:group-hover:bg-input/50 w-full rounded-t-none border-none focus-visible:ring-0 focus-visible:ring-offset-0'
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='p-1'>
          {items.slice(1).map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectWithInsetLabelDemo
