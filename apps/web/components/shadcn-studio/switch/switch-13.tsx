import { Switch } from '@/components/ui/switch'
import { CheckIcon, XIcon } from "lucide-react"

const SwitchPermanentIndicatorDemo = () => {
  return (
    <div className='relative'>
      <Switch
        className='peer [&_span]:bg-background! data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 [&_span]:data-checked:translate-x-4.5 [&_span]:data-checked:rtl:-translate-x-4.5'
        aria-label='Switch with icon indicators'
      />
      <span className='peer-data-checked:text-background pointer-events-none absolute top-1 left-0.75 transition-transform duration-300 peer-data-unchecked:invisible peer-data-unchecked:translate-x-full'>
        <CheckIcon className='size-3.5' aria-hidden='true' />
      </span>
      <span className='pointer-events-none absolute top-1 right-0.75 transition-transform duration-300 peer-data-checked:invisible peer-data-checked:-translate-x-full'>
        <XIcon className='size-3.5' aria-hidden='true' />
      </span>
    </div>
  )
}

export default SwitchPermanentIndicatorDemo
