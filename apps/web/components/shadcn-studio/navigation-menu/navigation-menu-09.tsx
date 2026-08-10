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
            <NavigationMenuTrigger className='[&>svg]:size-4'>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='w-50'>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='px-1 font-medium'>Introduction</div>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='px-1 font-medium'>Installation</div>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='px-1 font-medium'>Quick Start</div>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className='[&>svg]:size-4'>Components</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='w-50'>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='px-1 font-medium'>Alert Dialog</div>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='px-1 font-medium'>Hover Card</div>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink render={<Link href='#' />}>
                    <div className='px-1 font-medium'>Button</div>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink render={<Link href='#' />}>Docs</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

export default NavigationMenuDemo
