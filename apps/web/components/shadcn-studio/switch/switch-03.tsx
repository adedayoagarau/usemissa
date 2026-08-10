import { Switch } from '@/components/ui/switch'

const SwitchMiniDemo = () => {
  return (
    <Switch
      aria-label='Mini switch'
      className='[&_span]:border-input border-none data-[size=default]:h-3 [&_span]:border [&_span]:group-data-[size=default]/switch:size-4.5'
    />
  )
}

export default SwitchMiniDemo
