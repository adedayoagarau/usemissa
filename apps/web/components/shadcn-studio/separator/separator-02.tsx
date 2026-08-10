import { Separator } from '@/components/ui/separator'

const SeparatorVerticalDemo = () => {
  return (
    <div className='flex h-5 items-center gap-4 text-sm font-medium'>
      <div>Dashboard</div>
      <Separator orientation='vertical' />
      <div>Projects</div>
      <Separator orientation='vertical' />
      <div>Settings</div>
    </div>
  )
}

export default SeparatorVerticalDemo
