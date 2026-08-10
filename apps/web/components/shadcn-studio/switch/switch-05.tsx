import { Switch } from '@/components/ui/switch'

const SwitchSizesDemo = () => {
  return (
    <div className='flex items-center gap-3'>
      <Switch size='sm' aria-label='Small switch' />
      <Switch aria-label='Medium switch' />
      <Switch
        aria-label='Large switch'
        className='data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 data-checked:[&_span]:translate-x-4.5 data-checked:[&_span]:rtl:-translate-x-4.5'
      />
    </div>
  )
}

export default SwitchSizesDemo
