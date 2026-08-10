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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DRAWER_SIDES = ['top', 'right', 'bottom', 'left'] as const

const DrawerWithSides = () => {
  return (
    <div className='flex flex-wrap gap-2'>
      {DRAWER_SIDES.map(side => (
        <Drawer key={side} direction={side === 'bottom' ? undefined : (side as 'top' | 'right' | 'left')}>
          <DrawerTrigger render={<Button variant='outline' className='capitalize' />}>{side}</DrawerTrigger>
          <DrawerContent className='data-[vaul-drawer-direction=bottom]:max-h-[50vh] data-[vaul-drawer-direction=top]:max-h-[50vh]'>
            <DrawerHeader>
              <DrawerTitle>Edit Profile</DrawerTitle>
              <DrawerDescription>
                Make changes to your profile here. Click save when you&apos;re done.
              </DrawerDescription>
            </DrawerHeader>
            <div className='grid flex-1 auto-rows-min gap-6 px-4'>
              <div className='grid gap-3'>
                <Label htmlFor='drawer-demo-name'>Name</Label>
                <Input id='drawer-demo-name' defaultValue='Pedro Duarte' />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='drawer-demo-username'>Username</Label>
                <Input id='drawer-demo-username' defaultValue='@peduarte' />
              </div>
            </div>
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose render={<Button variant='outline' />}>Cancel</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  )
}

export default DrawerWithSides
