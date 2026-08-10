import { Separator } from '@/components/ui/separator'

const SeparatorDetailDemo = () => {
  return (
    <div className='flex w-full max-w-sm flex-col gap-2 text-sm'>
      <dl className='flex items-center justify-between'>
        <dt className='font-medium'>Name</dt>
        <dd className='text-muted-foreground'>Sofia Davis</dd>
      </dl>
      <Separator />
      <dl className='flex items-center justify-between'>
        <dt className='font-medium'>Email</dt>
        <dd className='text-muted-foreground'>sofia@example.com</dd>
      </dl>
      <Separator />
      <dl className='flex items-center justify-between'>
        <dt className='font-medium'>Role</dt>
        <dd className='text-muted-foreground'>Developer</dd>
      </dl>
    </div>
  )
}

export default SeparatorDetailDemo
