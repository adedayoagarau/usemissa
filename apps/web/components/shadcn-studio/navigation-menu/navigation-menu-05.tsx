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
import { SparklesIcon, BoxIcon, PaintbrushIcon, ArrowRightIcon } from "lucide-react"

const products = [
  {
    icon: (
      <SparklesIcon
      />
    ),
    label: 'Design Tools',
    description: 'Powerful tools for creating stunning interfaces',
    href: '#'
  },
  {
    icon: (
      <BoxIcon
      />
    ),
    label: 'Component Library',
    description: 'Pre-built components ready to use',
    href: '#'
  },
  {
    icon: (
      <PaintbrushIcon
      />
    ),
    label: 'Theme Builder',
    description: 'Customize themes and styles effortlessly',
    href: '#'
  }
]

const ctaSection = {
  title: 'Start Designing',
  description: 'Explore our design system and build faster.',
  buttons: [
    {
      label: 'Browse Components',
      icon: (
        <ArrowRightIcon
        />
      ),
      variant: 'default' as const
    },
    { label: 'Learn More', variant: 'outline' as const }
  ]
}

const NavigationMenuDesignDemo = () => (
  <div className='flex items-center justify-center'>
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='[&>svg]:size-4'>Design</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className='w-70 p-1 sm:w-120 lg:w-135'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]'>
                <div>
                  {products.map(product => (
                    <NavigationMenuLink
                      render={<Link href={product.href} />}
                      key={product.label}
                      className='flex flex-row items-start gap-2 *:[svg]:mt-1 *:[svg]:size-5'
                    >
                      {product.icon}
                      <div>
                        <p className='font-medium'>{product.label}</p>
                        <p className='text-muted-foreground'>{product.description}</p>
                      </div>
                    </NavigationMenuLink>
                  ))}
                </div>
                <div className='bg-muted flex flex-col gap-4 rounded-lg p-4'>
                  <div className='space-y-1'>
                    <h4 className='font-medium'>{ctaSection.title}</h4>
                    <p className='text-muted-foreground text-sm'>{ctaSection.description}</p>
                  </div>
                  <div className='space-y-2'>
                    {ctaSection.buttons.map(button => (
                      <Button
                        render={<a href='#' />}
                        nativeButton={false}
                        className='w-full *:[svg]:size-4'
                        key={button.label}
                        variant={button.variant}
                      >
                        {button.label}
                        {button.icon}
                      </Button>
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

export default NavigationMenuDesignDemo
