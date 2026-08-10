import Link from 'next/link'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { BookOpenIcon, SparklesIcon, CodeIcon, ZapIcon, PaletteIcon, SettingsIcon } from "lucide-react"

const sections = [
  {
    title: 'Getting Started',
    items: [
      {
        icon: (
          <BookOpenIcon
          />
        ),
        label: 'Introduction',
        description: 'Learn the basics and core concepts',
        href: '#'
      },
      {
        icon: (
          <SparklesIcon
          />
        ),
        label: 'Quick Start',
        description: 'Get up and running in minutes',
        href: '#'
      }
    ]
  },
  {
    title: 'Components',
    items: [
      {
        icon: (
          <CodeIcon
          />
        ),
        label: 'UI Elements',
        description: 'Browse pre-built components',
        href: '#'
      },
      {
        icon: (
          <ZapIcon
          />
        ),
        label: 'Interactive',
        description: 'Dynamic and responsive elements',
        href: '#'
      }
    ]
  },
  {
    title: 'Customization',
    items: [
      {
        icon: (
          <PaletteIcon
          />
        ),
        label: 'Themes',
        description: 'Customize colors and styles',
        href: '#'
      },
      {
        icon: (
          <SettingsIcon
          />
        ),
        label: 'Configuration',
        description: 'Advanced settings and options',
        href: '#'
      }
    ]
  }
]

const NavigationMenuExploreDemo = () => (
  <div className='flex items-center justify-center'>
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='[&>svg]:size-4'>Explore</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className='w-80 p-2'>
              <div className='space-y-4'>
                {sections.map(section => (
                  <div key={section.title}>
                    <h4 className='mb-2 text-sm font-medium'>{section.title}</h4>
                    <div className='space-y-1'>
                      {section.items.map(item => (
                        <NavigationMenuLink
                          render={<Link href={item.href} />}
                          key={item.label}
                          className='flex items-start gap-2 *:[svg]:mt-1 *:[svg]:size-4'
                        >
                          {item.icon}
                          <div>
                            <p className='font-medium'>{item.label}</p>
                            <p className='text-muted-foreground'>{item.description}</p>
                          </div>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
)

export default NavigationMenuExploreDemo
