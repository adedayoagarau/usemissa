import { Input } from '@/components/ui/input'

const InputSizesDemo = () => {
  return (
    <div className='w-full max-w-xs space-y-2'>
      <Input type='text' placeholder='Extra Small input' className='h-6' />
      <Input type='text' placeholder='Small input' className='h-7' />
      <Input type='text' placeholder='Medium input' />
      <Input type='text' placeholder='Large input' className='h-9' />
    </div>
  )
}

export default InputSizesDemo
