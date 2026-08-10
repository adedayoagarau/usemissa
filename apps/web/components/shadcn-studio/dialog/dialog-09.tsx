import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DialogSubscribeDemo = () => {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant='outline' />}>Subscribe</DialogTrigger>
      <DialogContent className='p-6 sm:max-w-lg'>
        <DialogHeader className='text-center'>
          <DialogTitle className='text-xl'>Subscribe blog for latest updates</DialogTitle>
          <DialogDescription className='text-base'>
            Subscribe to our blog to stay updated with the latest posts and news. Simply enter your email address and
            click &apos;Subscribe&apos; to receive notifications.
          </DialogDescription>
        </DialogHeader>
        <form className='flex gap-4'>
          <div className='grid grow gap-3'>
            <Label htmlFor='email'>Email</Label>
            <Input type='email' id='email' name='email' placeholder='example@gmail.com' required />
          </div>
          <Button type='submit' className='self-end'>
            Subscribe
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DialogSubscribeDemo
