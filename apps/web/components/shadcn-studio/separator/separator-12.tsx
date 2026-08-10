import { Separator } from '@/components/ui/separator'

const SeparatorStylesDemo = () => {
  return (
    <div className='w-full max-w-sm'>
      <div className='space-y-4'>
        <h4 className='text-base font-medium'>Dashed Thickness</h4>
        <div className='flex flex-col gap-2'>
          <div className='space-y-2'>
            <p className='text-muted-foreground text-sm'>1px</p>
            <Separator className='border-border h-0 border-b border-dashed bg-transparent' />
          </div>
          <div className='space-y-2'>
            <p className='text-muted-foreground text-sm'>2px</p>
            <Separator className='border-border h-0 border-b-2 border-dashed bg-transparent' />
          </div>
          <div className='space-y-2'>
            <p className='text-muted-foreground text-sm'>4px</p>
            <Separator className='border-border h-0 border-b-4 border-dashed bg-transparent' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeparatorStylesDemo
