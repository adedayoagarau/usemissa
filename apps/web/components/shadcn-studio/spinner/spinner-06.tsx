import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const SpinnerTextDemo = () => {
  return (
    <div className='mx-auto flex w-full items-center justify-center'>
      <div className='flex w-full max-w-xs flex-col items-center gap-2'>
        <div className='bg-muted rounded-md p-3'>
          <Spinner className='size-6' />
        </div>
        <div className='text-lg font-medium'>Restoring your session</div>
        <div className='text-muted-foreground text-center'>
          Re-authenticating and restoring your preferences securely.
        </div>
        <Button variant='outline'>Sign out</Button>
      </div>
    </div>
  )
}

export default SpinnerTextDemo
