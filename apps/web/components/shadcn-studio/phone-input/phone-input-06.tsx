import { PhoneInput } from '@/components/ui/phone-input'
import { Label } from '@/components/ui/label'

const PhoneInputWithHelperText = () => {
  return (
    <div className='space-y-2'>
      <Label htmlFor='phone'>Phone Input with helper text</Label>
      <PhoneInput id='phone' placeholder='Enter contact number' />
      <p className='text-muted-foreground text-xs'>We&apos;ll never share your phone number with anyone else.</p>
    </div>
  )
}

export default PhoneInputWithHelperText
