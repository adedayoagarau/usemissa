import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LabelForm = () => {
  return (
    <div className='w-full max-w-sm space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='name'>Name</Label>
        <Input id='name' placeholder='Enter your name' />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='email'>Email</Label>
        <Input id='email' placeholder='Enter your email' />
      </div>
      <Button type='submit' className='w-full'>
        Submit
      </Button>
    </div>
  )
}

export default LabelForm
