import Link from 'next/link'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { CodeIcon, TerminalIcon, GitBranchIcon, GlobeIcon, ZapIcon, SettingsIcon, FileTextIcon, BookOpenIcon, MessageSquareIcon } from "lucide-react"

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
  }
]

const integrations = [
  {
    icon: (
      <GlobeIcon
      />
    ),
    label: 'API Access',
    description: 'RESTful API endpoints',
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
  },
  {
    icon: (
      <SettingsIcon
      />
    ),
    label: 'Plugins',
    description: 'Extend functionality with plugins',
    href: '#'
  }
]

const resources = [
  {
    icon: (
      <FileTextIcon
      />
    ),
    label: 'API Docs',
    href: '#'
  },
  {
    icon: (
      <BookOpenIcon
      />
    ),
    label: 'Guides',
    href: '#'
  },
  {
    icon: (
      <MessageSquareIcon
      />
    ),
    label: 'Community',
    href: '#'
  }
]

const support = [
  { label: 'Help Center', href: '#' },
  { label: 'Changelog', href: '#' },
  { label: 'Status', href: '#' }
]

const NavigationMenuDevToolDemo = () => (
  <div className='flex items-center justify-center'>
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='[&>svg]:size-4'>Dev Tools</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className='w-50 p-2 sm:w-120'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'>
                <div>
                  <h4 className='text-muted-foreground mb-3 text-sm font-medium'>TOOLS</h4>
                  <div className='space-y-1'>
                    {tools.map(feature => (
                      <NavigationMenuLink
                        render={<Link href={feature.href} />}
                        key={feature.label}
                        className='flex items-center gap-2 *:[svg]:size-4'
                      >
                        {feature.icon}
                        <span className='text-sm font-medium'>{feature.label}</span>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className='text-muted-foreground mb-3 text-sm font-medium'>INTEGRATIONS</h4>
                  <div className='space-y-1'>
                    {integrations.map(feature => (
                      <NavigationMenuLink
                        render={<Link href={feature.href} />}
                        key={feature.label}
                        className='flex items-center gap-2 *:[svg]:size-4'
                      >
                        {feature.icon}
                        <span className='text-sm font-medium'>{feature.label}</span>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className='text-muted-foreground mb-3 text-sm font-medium'>RESOURCES</h4>
                  <div className='space-y-1'>
                    {resources.map(resource => (
                      <NavigationMenuLink
                        render={<Link href={resource.href} />}
                        key={resource.label}
                        className='flex items-center gap-2 *:[svg]:size-4'
                      >
                        {resource.icon}
                        <span className='text-sm font-medium'>{resource.label}</span>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className='text-muted-foreground mb-3 text-sm font-medium'>SUPPORT</h4>
                  <div className='space-y-1'>
                    {support.map(item => (
                      <NavigationMenuLink render={<Link href={item.href} />} key={item.label}>
                        <span className='text-sm font-medium'>{item.label}</span>
                      </NavigationMenuLink>
                    ))}
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

export default NavigationMenuDevToolDemo
