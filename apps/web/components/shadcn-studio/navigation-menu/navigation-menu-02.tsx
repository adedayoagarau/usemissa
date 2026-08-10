import Link from 'next/link'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'

const components: { title: string; href: string; description: string }[] = [
  {
    title: 'Overview',
    href: '#',
    description: 'Start with a high-level introduction to the system, its patterns, and core building blocks.'
  },
  {
    title: 'Design System',
    href: '#',
    description: 'Explore the tokens, spacing rules, and visual language used across every interface.'
  },
  {
    title: 'Components',
    href: '#',
    description: 'Browse reusable UI elements with practical examples, variants, and implementation notes.'
  },
  {
    title: 'Templates',
    href: '#',
    description: 'Use production-ready page sections and layouts to speed up assembly and prototyping.'
  },
  {
    title: 'Theming',
    href: '#',
    description: 'Customize color, typography, and surface styles to match different product directions.'
  },
  {
    title: 'Documentation',
    href: '#',
    description: 'Find setup guidance, usage details, and references to support implementation work.'
  }
]

const NavigationMenuTwoColumnDemo = () => {
  return (
    <div className='flex items-center justify-center'>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem className='flex'>
            <NavigationMenuTrigger className='[&>svg]:size-4'>Resources</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className='grid w-100 gap-2 md:w-125 md:grid-cols-2 lg:w-125'>
                {components.map(component => (
                  <NavigationMenuLink render={<Link href={component.href} />} key={component.title}>
                    <div className='flex flex-col text-sm'>
                      <div className='font-medium'>{component.title}</div>
                      <div className='text-muted-foreground line-clamp-2'>{component.description}</div>
                    </div>
                  </NavigationMenuLink>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  )
}

export default NavigationMenuTwoColumnDemo
