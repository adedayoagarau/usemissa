import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const SeparatorButtonDemo = () => {
  return (
    <div className='flex w-fit flex-col items-center justify-center gap-4'>
      <Button variant='outline' size='lg' className='border-primary text-primary w-full'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/brand-logo/twitter-icon.png?width=20&height=20&format=auto'
          alt='X Icon'
          className='size-5 dark:invert'
        />
        <span className='flex flex-1 justify-center'>Continue with X</span>
      </Button>

      <Separator />

      <Button variant='outline' size='lg' className='border-primary text-primary'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/brand-logo/github-icon.png?width=20&height=20&format=auto'
          alt='GitHub Icon'
          className='size-5 dark:invert'
        />
        <span className='flex flex-1 justify-center'>Continue with GitHub</span>
      </Button>
    </div>
  )
}

export default SeparatorButtonDemo
