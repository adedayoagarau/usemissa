import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'

const PhoneInputRounded = () => {
  return (
    <div className='space-y-2'>
      <Label htmlFor='phone'>Rounded Phone Input</Label>
      <PhoneInput
        id='phone'
        placeholder='Enter contact number'
        triggerClassName='rounded-l-full'
        inputClassName='rounded-r-full rounded-l-none'
      />
    </div>
  )
}

export default PhoneInputRounded
