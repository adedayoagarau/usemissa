import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'

const PhoneInputWithDefaultValue = () => {
  return (
    <div className='space-y-2'>
      <Label htmlFor='phone'>Invalid Phone Input</Label>
      <PhoneInput aria-invalid='true' value='+12125551234' placeholder='Enter phone number' />
      <p className='text-destructive text-xs'>Please enter a valid phone number.</p>
    </div>
  )
}

export default PhoneInputWithDefaultValue
