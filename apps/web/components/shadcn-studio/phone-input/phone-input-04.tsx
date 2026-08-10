import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'

const PhoneInputWithLabel = () => {
  return (
    <div className='space-y-2'>
      <Label htmlFor='phone'>Disabled Phone Input</Label>
      <PhoneInput id='phone' placeholder='Enter contact number' disabled />
    </div>
  )
}

export default PhoneInputWithLabel
