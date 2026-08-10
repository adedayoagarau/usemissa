import { PhoneInput } from '@/components/ui/phone-input'

const PhoneInputSizes = () => {
  return (
    <div className='space-y-4'>
      <PhoneInput placeholder='Small Input' variant='sm' defaultCountry='US' />
      <PhoneInput placeholder='Large Input' variant='lg' defaultCountry='US' />
    </div>
  )
}

export default PhoneInputSizes
