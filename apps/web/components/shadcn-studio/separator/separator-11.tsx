import { Separator } from '@/components/ui/separator'

const SeparatorStylesDemo = () => {
  return (
    <div className='w-full max-w-sm'>
      <div className='space-y-4'>
        <h4 className='text-base font-medium'>Solid Thickness</h4>
        <div className='flex flex-col gap-2'>
          <div className='space-y-2'>
            <p className='text-muted-foreground text-sm'>1px (Default)</p>
            <Separator />
          </div>
          <div className='space-y-2'>
            <p className='text-muted-foreground text-sm'>2px</p>
            <Separator className='data-horizontal:h-0.5' />
          </div>
          <div className='space-y-2'>
            <p className='text-muted-foreground text-sm'>4px</p>
            <Separator className='data-horizontal:h-1' />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeparatorStylesDemo
