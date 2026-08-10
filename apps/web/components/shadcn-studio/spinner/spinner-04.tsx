import { Spinner } from '@/components/ui/spinner'

const SpinnerColorDemo = () => {
  return (
    <div className='flex items-center gap-6'>
      <Spinner className='size-6 text-sky-600 dark:text-sky-400' />
      <Spinner className='size-6 text-amber-600 dark:text-amber-400' />
      <Spinner className='text-destructive size-6' />
      <Spinner className='size-6 text-green-600 dark:text-green-400' />
    </div>
  )
}

export default SpinnerColorDemo
