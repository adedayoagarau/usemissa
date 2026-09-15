import { Spinner } from '@/components/ui/spinner'

const SpinnerColorDemo = () => {
  return (
    <div className='flex items-center gap-6'>
      <Spinner className='size-6 text-sky-600 dark:text-sky-400' />
      <Spinner className='size-6 text-warning dark:text-warning' />
      <Spinner className='text-destructive size-6' />
      <Spinner className='size-6 text-success dark:text-success' />
    </div>
  )
}

export default SpinnerColorDemo
