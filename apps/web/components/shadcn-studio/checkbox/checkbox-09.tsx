import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AppleIcon, CherryIcon, GrapeIcon } from "lucide-react"

const fruits = [
  {
    label: 'Apple',
    icon: (
      <AppleIcon aria-hidden='true' />
    )
  },
  {
    label: 'Cherry',
    icon: (
      <CherryIcon aria-hidden='true' />
    )
  },
  {
    label: 'Grape',
    icon: (
      <GrapeIcon aria-hidden='true' />
    )
  }
]

const CheckboxVerticalGroupDemo = () => {
  return (
    <div className='space-y-4'>
      <Label className='font-semibold'>Favorite Fruits</Label>
      <div className='flex flex-col gap-4'>
        {fruits.map(({ label, icon }) => (
          <div key={label} className='flex items-center gap-2'>
            <Checkbox id={label} />
            <Label htmlFor={label} className='*:[svg]:size-4'>
              {icon}
              {label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CheckboxVerticalGroupDemo
