import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'

const PhoneInputReadOnly = () => {
  return (
    <div className='space-y-2'>
      <Label htmlFor='phone'>Read-only Phone Input</Label>
      <PhoneInput readOnly value='+12125551234' placeholder='Enter phone number' />
    </div>
  )
}

export default PhoneInputReadOnly
