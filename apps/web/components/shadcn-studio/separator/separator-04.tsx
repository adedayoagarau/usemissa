import { Separator } from '@/components/ui/separator'

const SeparatorVerticalDescriptionDemo = () => {
  return (
    <div className='flex items-center gap-4 text-center text-sm'>
      <div className='flex flex-col items-center gap-1'>
        <span className='text-lg font-medium'>128</span>
        <span className='text-muted-foreground text-xs font-medium uppercase'>Posts</span>
      </div>
      <Separator orientation='vertical' className='h-12' />
      <div className='flex flex-col items-center gap-1'>
        <span className='text-lg font-medium'>12.4k</span>
        <span className='text-muted-foreground text-xs font-medium uppercase'>Followers</span>
      </div>
      <Separator orientation='vertical' className='h-12' />
      <div className='flex flex-col items-center gap-1'>
        <span className='text-lg font-medium'>890</span>
        <span className='text-muted-foreground text-xs font-medium uppercase'>Following</span>
      </div>
    </div>
  )
}

export default SeparatorVerticalDescriptionDemo
