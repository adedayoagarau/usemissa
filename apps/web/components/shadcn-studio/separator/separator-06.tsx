import { Separator } from '@/components/ui/separator'

const SeparatorStylesDemo = () => {
  return (
    <div className='w-full max-w-sm'>
      <div className='flex flex-col gap-6'>
        <div className='space-y-3'>
          <h4 className='text-sm font-medium'>Solid (Default)</h4>
          <Separator />
        </div>

        <div className='space-y-3'>
          <h4 className='text-sm font-medium'>Dashed</h4>
          <Separator className='border-border border-b-2 border-dashed bg-transparent' />
        </div>

        <div className='space-y-3'>
          <h4 className='text-sm font-medium'>Dotted</h4>
          <Separator className='border-border border-b-[3px] border-dotted bg-transparent' />
        </div>

        <div className='space-y-3'>
          <h4 className='text-sm font-medium'>Gradient Faded</h4>
          <Separator className='via-border bg-transparent bg-linear-to-r from-transparent to-transparent' />
        </div>
      </div>
    </div>
  )
}

export default SeparatorStylesDemo
