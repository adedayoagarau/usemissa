import { Separator } from '@/components/ui/separator'

const SeparatorDemo = () => {
  return (
    <div className='flex max-w-sm flex-col gap-4 py-4 text-sm'>
      <div className='flex flex-col gap-1'>
        <div className='font-medium'>Project Settings</div>
        <div className='text-muted-foreground'>Manage your project configuration and preferences.</div>
      </div>
      <Separator />
      <p>
        Configure notifications, integrations, and access controls to tailor the workspace to your team&apos;s needs.
      </p>
    </div>
  )
}

export default SeparatorDemo
