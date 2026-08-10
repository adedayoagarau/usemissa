import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const SeparatorButtonDemo = () => {
  return (
    <div className='flex w-fit flex-col items-center justify-center gap-4 sm:w-full sm:flex-row'>
      <Button variant='outline' size='lg' className='border-destructive! text-destructive!'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/brand-logo/google-icon.png?width=20&height=20&format=auto'
          alt='Google Icon'
          className='size-5'
        />
        <span className='flex flex-1 justify-center'>Continue with Google</span>
      </Button>

      <Separator orientation='vertical' className='hidden h-9 sm:block' />
      <Separator className='block h-9 sm:hidden' />

      <Button variant='outline' size='lg' className='border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/brand-logo/facebook-icon.png?width=20&height=20&format=auto'
          alt='Facebook Icon'
          className='size-5'
        />
        <span className='flex flex-1 justify-center'>Continue with Facebook</span>
      </Button>
    </div>
  )
}

export default SeparatorButtonDemo
