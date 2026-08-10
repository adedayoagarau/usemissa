import { Switch } from '@/components/ui/switch'
import { CheckIcon, XIcon } from "lucide-react"

const SwitchIconIndicatorDemo = () => {
  return (
    <div className='relative'>
      <Switch
        className='peer bg-input/50! [&_span]:bg-background! data-[size=default]:h-5.5 data-[size=default]:w-10 [&_span]:group-data-[size=default]/switch:size-5 [&_span]:data-checked:translate-x-4.5 [&_span]:data-checked:rtl:-translate-x-4.5'
        aria-label='Switch with icon indicators'
      />
      <span className='peer-data-checked:text-muted-foreground/70 pointer-events-none absolute top-1 left-0.75'>
        <CheckIcon className='size-3.5' aria-hidden='true' />
      </span>
      <span className='peer-data-unchecked:text-muted-foreground/70 pointer-events-none absolute top-1 right-0.75'>
        <XIcon className='size-3.5' aria-hidden='true' />
      </span>
    </div>
  )
}

export default SwitchIconIndicatorDemo
