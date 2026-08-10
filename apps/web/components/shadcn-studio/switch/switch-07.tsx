import { Switch } from '@/components/ui/switch'

const SwitchGradientDemo = () => {
  return (
    <Switch
      aria-label='Destructive Switch'
      className='focus-visible:border-destructive to-destructive/60 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 bg-linear-to-r from-amber-500 bg-origin-border data-checked:from-sky-400 data-checked:to-indigo-700 data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 data-checked:[&_span]:translate-x-4.5 data-checked:[&_span]:rtl:-translate-x-4.5'
    />
  )
}

export default SwitchGradientDemo
