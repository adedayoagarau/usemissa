import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ZapIcon, PlugIcon, ShieldIcon, HeadphonesIcon, PaletteIcon, BarChart3Icon, UsersIcon, CloudIcon } from "lucide-react"

const features = [
  {
    icon: (
      <ZapIcon
      />
    ),
    title: 'Lightning Fast',
    description: 'Optimized for speed with instant loading and smooth performance across all devices.'
  },
  {
    icon: (
      <PlugIcon
      />
    ),
    title: 'Easy Integration',
    description: 'Seamlessly connects with your existing tools and workflows without complex setup.'
  },
  {
    icon: (
      <ShieldIcon
      />
    ),
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with 99.9% uptime and data protection you can trust.'
  },
  {
    icon: (
      <HeadphonesIcon
      />
    ),
    title: '24/7 Support',
    description: 'Round-the-clock customer assistance with dedicated support teams ready to help.'
  },
  {
    icon: (
      <PaletteIcon
      />
    ),
    title: 'Fully Customizable',
    description: 'Tailor the interface and functionality to match your specific needs and preferences.'
  },
  {
    icon: (
      <BarChart3Icon
      />
    ),
    title: 'Advanced Analytics',
    description: 'Detailed insights and reporting to help you make data-driven decisions.'
  },
  {
    icon: (
      <UsersIcon
      />
    ),
    title: 'Team Collaboration',
    description: 'Work together efficiently with real-time collaboration and sharing features.'
  },
  {
    icon: (
      <CloudIcon
      />
    ),
    title: 'Cloud-Based',
    description: 'Access your data and tools from anywhere, anytime with secure cloud storage.'
  }
]

const ScrollAreaHorizontalDemo = () => {
  return (
    <div className='mx-4 rounded-md border'>
      <ScrollArea className='relative w-full max-w-xs md:max-w-md'>
        <h4 className='absolute top-4 left-4 text-sm font-medium'>Scrollable Content</h4>
        <div className='mt-6 mb-1 p-4'>
          <div className='flex space-x-4'>
            {features.map((feature, i) => (
              <div
                key={i}
                className='min-h-32 w-48 shrink-0 rounded-lg border p-4 shadow-xs *:[svg]:mb-3 *:[svg]:size-6'
              >
                {feature.icon}
                <h5 className='mb-2 text-sm font-medium'>{feature.title}</h5>
                <p className='text-muted-foreground text-xs'>{feature.description}</p>
              </div>
            ))}
            <div className='w-px shrink-0' />
          </div>
        </div>
        <ScrollBar orientation='horizontal' className='m-1' />
      </ScrollArea>
    </div>
  )
}

export default ScrollAreaHorizontalDemo
