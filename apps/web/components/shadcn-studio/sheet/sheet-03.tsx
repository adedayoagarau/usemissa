import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { XIcon } from "lucide-react"

const SheetWithNoOverlayDemo = () => {
  return (
    <Sheet modal={false}>
      <SheetTrigger render={<Button variant='outline' />}>No Overlay</SheetTrigger>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Popup
          data-slot='sheet-content'
          data-side='right'
          className='bg-popover text-popover-foreground fixed z-50 flex flex-col gap-4 bg-clip-padding text-sm shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10 data-[side=right]:sm:max-w-sm'
        >
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>Make changes to your profile here. Click save when you&apos;re done.</SheetDescription>
          </SheetHeader>
          <div className='grid flex-1 auto-rows-min gap-6 px-4'>
            <div className='grid gap-3'>
              <Label htmlFor='sheet-demo-name'>Name</Label>
              <Input id='sheet-demo-name' defaultValue='Pedro Duarte' />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='sheet-demo-username'>Username</Label>
              <Input id='sheet-demo-username' defaultValue='@peduarte' />
            </div>
          </div>
          <SheetFooter>
            <Button type='submit'>Save changes</Button>
            <SheetClose render={<Button variant='outline' />}>Close</SheetClose>
          </SheetFooter>
          <SheetPrimitive.Close
            data-slot='sheet-close'
            render={<Button variant='ghost' className='absolute top-3 right-3' size='icon-sm' />}
          >
            <XIcon
            />
            <span className='sr-only'>Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Popup>
      </SheetPrimitive.Portal>
    </Sheet>
  )
}

export default SheetWithNoOverlayDemo
