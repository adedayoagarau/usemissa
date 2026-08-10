import { useId } from 'react'

const TextareaWithInsetLabelDemo = () => {
  const id = useId()

  return (
    <div className='border-input bg-background focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 relative w-full max-w-xs rounded-lg border transition-colors outline-none focus-within:ring-3 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-[input:is(:disabled)]:*:pointer-events-none'>
      <label htmlFor={id} className='text-foreground block px-2.5 pt-1 text-xs font-medium'>
        Textarea with inset label
      </label>
      <textarea
        id={id}
        className='text-foreground placeholder:text-muted-foreground/70 flex min-h-14 w-full px-2.5 pb-2 text-sm focus-visible:outline-none'
      />
    </div>
  )
}

export default TextareaWithInsetLabelDemo
