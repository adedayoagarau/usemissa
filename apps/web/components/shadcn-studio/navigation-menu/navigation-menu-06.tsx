import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { CodeIcon, TerminalIcon, GitBranchIcon, ZapIcon, ArrowRightIcon } from "lucide-react"

const tools = [
  {
    icon: (
      <CodeIcon
      />
    ),
    label: 'Code Editor',
    description: 'Advanced code editing features',
    href: '#'
  },
  {
    icon: (
      <TerminalIcon
      />
    ),
    label: 'Terminal',
    description: 'Integrated command line interface',
    href: '#'
  },
  {
    icon: (
      <GitBranchIcon
      />
    ),
    label: 'Version Control',
    description: 'Git integration and management',
    href: '#'
  },
  {
    icon: (
      <ZapIcon
      />
    ),
    label: 'Webhooks',
    description: 'Real-time event notifications',
    href: '#'
  }
]

const sidebar = {
  tutorial: {
    title: 'Developer Guide',
    description: 'Master the platform in 15 minutes',
    button: {
      label: 'Read Guide',
      icon: (
        <ArrowRightIcon
        />
      )
    }
  }
}

const NavigationMenuDevelopDemo = () => (
  <div className='flex items-center justify-center'>
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='[&>svg]:size-4'>Develop</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className='w-70 p-2 sm:w-145'>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                <div>
                  <div>
                    <h4 className='text-muted-foreground mb-3 text-sm font-medium'>TOOLS</h4>
                    <div className='space-y-2'>
                      {tools.map(feature => (
                        <NavigationMenuLink
                          render={<Link href={feature.href} />}
                          key={feature.label}
                          className='flex flex-row items-start gap-2 *:[svg]:size-5'
                        >
                          {feature.icon}
                          <div>
                            <p className='font-medium'>{feature.label}</p>
                            <p className='text-muted-foreground'>{feature.description}</p>
                          </div>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </div>
                </div>
                <div className='space-y-4'>
                  <div className='bg-muted rounded-lg p-4'>
                    <img
                      src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-55.png'
                      alt='Developer workspace'
                      className='aspect-video w-full rounded object-cover'
                    />
                    <div className='mt-3 space-y-2'>
                      <h4 className='mb-1 font-medium'>{sidebar.tutorial.title}</h4>
                      <p className='text-muted-foreground text-sm'>{sidebar.tutorial.description}</p>
                      <Button className='w-full justify-between'>
                        {sidebar.tutorial.button.label}
                        {sidebar.tutorial.button.icon}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
)

export default NavigationMenuDevelopDemo
