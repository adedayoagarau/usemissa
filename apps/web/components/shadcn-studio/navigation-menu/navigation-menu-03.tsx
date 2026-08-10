import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { PaletteIcon, TypeIcon, BoxIcon, PaintbrushIcon, CodeIcon, EyeIcon } from "lucide-react"

const features = [
  {
    icon: (
      <PaletteIcon
      />
    ),
    label: 'Color Picker',
    description: 'Intuitive color selection with hex, RGB, and HSL support',
    badge: { label: 'New', variant: 'default' as const },
    href: '#'
  },
  {
    icon: (
      <TypeIcon
      />
    ),
    label: 'Typography Editor',
    description: 'Fine-tune fonts, sizes, and spacing for perfect text hierarchy',
    badge: { label: 'Beta', variant: 'secondary' as const },
    href: '#'
  },
  {
    icon: (
      <BoxIcon
      />
    ),
    label: 'Component Library',
    description: 'Pre-built components with customizable variants and states',
    badge: { label: 'Pro', variant: 'outline' as const },
    href: '#'
  },
  {
    icon: (
      <PaintbrushIcon
      />
    ),
    label: 'Theme Builder',
    description: 'Create and manage design themes with live preview',
    badge: { label: 'Preview', variant: 'outline' as const },
    href: '#'
  },
  {
    icon: (
      <CodeIcon
      />
    ),
    label: 'Code Generator',
    description: 'Automatically generate clean, production-ready code',
    badge: { label: 'New', variant: 'default' as const },
    href: '#'
  },
  {
    icon: (
      <EyeIcon
      />
    ),
    label: 'Accessibility Checker',
    description: 'Ensure your designs meet WCAG guidelines and best practices',
    badge: { label: 'Beta', variant: 'secondary' as const },
    href: '#'
  }
]

const NavigationMenuFeatureDemo = () => (
  <div className='flex items-center justify-center'>
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='[&>svg]:size-4'>Features</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className='w-100 space-y-1 p-1'>
              {features.map(feature => (
                <NavigationMenuLink
                  render={<Link href={feature.href} />}
                  key={feature.label}
                  className='flex items-start gap-2 *:[svg]:mt-1 *:[svg]:size-5'
                >
                  {feature.icon}
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{feature.label}</span>
                      <Badge variant={feature.badge.variant}>{feature.badge.label}</Badge>
                    </div>
                    <span className='text-muted-foreground'>{feature.description}</span>
                  </div>
                </NavigationMenuLink>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
)

export default NavigationMenuFeatureDemo
