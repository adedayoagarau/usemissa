import Link from 'next/link'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'

const NavigationMenuDemo = () => {
  return (
    <div className='flex items-center justify-center'>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='[&>svg]:size-4'>Components</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='w-80'>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='flex flex-col px-1'>
                      <div className='font-medium'>Alert Dialog</div>
                      <div className='text-muted-foreground text-sm'>
                        A modal dialog that interrupts the user with important content and expects a response.
                      </div>
                    </div>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='flex flex-col px-1'>
                      <div className='font-medium'>Hover Card</div>
                      <div className='text-muted-foreground text-sm'>
                        For sighted users to preview content available behind a link.
                      </div>
                    </div>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

export default NavigationMenuDemo
