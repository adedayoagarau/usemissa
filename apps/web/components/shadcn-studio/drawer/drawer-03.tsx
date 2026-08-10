import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { ArrowRightIcon } from "lucide-react"

const DrawerScrollableContent = () => {
  return (
    <Drawer direction='right'>
      <DrawerTrigger render={<Button variant='outline' />}>Scrollable Content</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>shadcn/ui</DrawerTitle>
          <DrawerDescription>
            It is a set of beautifully-designed, accessible components and a code distribution platform.
          </DrawerDescription>
        </DrawerHeader>
        <div className='no-scrollbar overflow-y-auto px-4'>
          {Array.from({ length: 10 }).map((_, index) => (
            <p key={index} className='mb-4'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
              dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
              ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
              fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
              mollit anim id est laborum.
            </p>
          ))}
        </div>
        <DrawerFooter>
          <Button>
            Learn more{' '}
            <ArrowRightIcon
            />
          </Button>
          <DrawerClose render={<Button variant='outline' />}>Got it !</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerScrollableContent
