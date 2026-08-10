import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { BellIcon, XIcon, LinkIcon } from "lucide-react"

const DrawerNotifications = () => {
  return (
    <div className='flex gap-4'>
      <Drawer direction='right'>
        <DrawerTrigger render={<Button variant='outline' size='icon' className='relative' />}><BellIcon
                          /><span className='sr-only'>Messages</span><Badge variant='destructive' className='absolute -top-2.5 -right-2.5 h-5 min-w-5 px-1 tabular-nums'>
                            8
                          </Badge></DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Notifications</DrawerTitle>
          </DrawerHeader>
          <div className='grid flex-1 auto-rows-min gap-6 px-4'>
            <div className='flex items-center gap-4'>
              <Avatar className='size-9.5'>
                <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-19.png' />
                <AvatarFallback>MB</AvatarFallback>
              </Avatar>
              <div className='flex w-full flex-col items-start'>
                <span className='text-base font-medium'>Mark Bush</span>
                <div className='flex items-center gap-2.5'>
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>12 Minutes ago</span>
                  <div className='bg-muted size-1.5 rounded-full' />
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>New post</span>
                </div>
              </div>
              <div className='flex flex-col items-center gap-3'>
                <XIcon className='text-foreground size-3.5' />
                <div className='bg-primary size-1.5 rounded-full' />
              </div>
            </div>
            <Separator />
            <div className='flex items-center gap-4'>
              <Avatar className='size-9.5'>
                <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' />
                <AvatarFallback>SB</AvatarFallback>
              </Avatar>
              <div className='flex w-full flex-col items-start'>
                <span className='text-base font-medium'>Sarah Brown</span>
                <div className='flex items-center gap-2.5'>
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>24 Minutes ago</span>
                  <div className='bg-muted size-1.5 rounded-full' />
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>New comment</span>
                </div>
              </div>
              <div className='flex flex-col items-center gap-3'>
                <XIcon className='text-foreground size-3.5' />
                <div className='bg-primary size-1.5 rounded-full' />
              </div>
            </div>
            <Separator />
            <div className='flex items-start gap-4'>
              <Avatar className='size-9.5'>
                <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png' />
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className='flex w-full flex-col items-start'>
                <span className='text-base font-medium'>Anna has applied to create an ad for your campaign</span>
                <div className='flex items-center gap-2.5'>
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>2 hours ago</span>
                  <div className='bg-muted size-1.5 rounded-full' />
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>New request for campaign</span>
                </div>
                <div className='mt-3 flex items-center gap-4'>
                  <Button variant='secondary' size='sm'>
                    Decline
                  </Button>
                  <Button size='sm'>Accept</Button>
                </div>
              </div>
            </div>
            <Separator />
            <div className='flex items-start gap-4'>
              <Avatar className='size-9.5'>
                <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png' />
                <AvatarFallback>J</AvatarFallback>
              </Avatar>
              <div className='flex w-full flex-col items-start'>
                <span className='text-base font-medium'>Jason attached the file</span>
                <div className='flex items-center gap-2.5'>
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>6 hours ago</span>
                  <div className='bg-muted size-1.5 rounded-full' />
                  <span className='text-muted-foreground text-sm max-sm:text-xs'>Attached files</span>
                </div>
                <div className='mt-3 flex items-center gap-1.5'>
                  <LinkIcon className='size-4' />
                  <span className='text-sm'>Work examples.com</span>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default DrawerNotifications
