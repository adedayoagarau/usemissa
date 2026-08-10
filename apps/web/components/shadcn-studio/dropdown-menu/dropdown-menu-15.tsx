import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

const DropdownSlideLeftAnimationDemo = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline'>Slide Left Animation</Button>} />
      <DropdownMenuContent className='data-open:slide-in-from-left-20 data-open:zoom-in-100 data-open:data-[side=bottom]:slide-in-from-top-0 data-open:data-[side=top]:slide-in-from-bottom-0 data-closed:slide-out-to-left-20 data-closed:zoom-out-100 w-56 duration-400'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Settings</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem>My Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>FAQs</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Contact</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem>Call Support</DropdownMenuItem>
          <DropdownMenuItem>Chat with us</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownSlideLeftAnimationDemo
