import Link from 'next/link'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu'
import { FileTextIcon, BookOpenIcon, MessageSquareIcon } from "lucide-react"

const stats = [
  { label: 'Active Users', value: '2,543', change: '+12%' },
  { label: 'Revenue', value: '$12.5k', change: '+8%' },
  { label: 'Conversions', value: '142', change: '-23%' }
]

const reports = [
  {
    icon: (
      <FileTextIcon
      />
    ),
    title: 'Overview',
    desc: 'Key metrics and trends'
  },
  {
    icon: (
      <BookOpenIcon
      />
    ),
    title: 'Performance',
    desc: 'Detailed performance analysis'
  },
  {
    icon: (
      <MessageSquareIcon
      />
    ),
    title: 'Audience',
    desc: 'User demographics and behavior'
  }
]

const customReports = [
  { title: 'Sales Funnel', desc: 'Track conversion stages' },
  { title: 'Cohort Analysis', desc: 'User retention over time' },
  { title: 'A/B Test Results', desc: 'Experiment outcomes', highlighted: true }
]

const NavigationMenuDesignDemo = () => (
  <div className='flex items-center justify-center'>
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='[&>svg]:size-4'>Analytics</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className='w-50 p-2 sm:w-120'>
              <div className='grid gap-6'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                  {stats.map(stat => (
                    <div key={stat.label} className='rounded-lg border p-2 shadow-sm'>
                      <div className='text-muted-foreground text-xs'>{stat.label}</div>
                      <div className='mt-2 flex items-center justify-between gap-3'>
                        <div className='text-xl font-medium'>{stat.value}</div>
                        <div className='text-muted-foreground text-sm font-medium'>{stat.change}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                  <div>
                    <h4 className='mb-3 text-sm font-medium'>Reports</h4>
                    <div className='flex flex-col gap-1'>
                      {reports.map(r => (
                        <NavigationMenuLink
                          render={<Link href='#' />}
                          key={r.title}
                          className='flex items-center gap-2 py-2 text-sm font-medium *:[svg]:size-4'
                        >
                          {r.icon}
                          <span>{r.title}</span>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className='mb-3 text-sm font-medium'>Custom Reports</h4>
                    <div className='flex flex-col gap-1'>
                      {customReports.map(cr => (
                        <NavigationMenuLink
                          render={<Link href='#' />}
                          key={cr.title}
                          className={
                            'flex items-center justify-between rounded-md px-3 py-2 ' +
                            (cr.highlighted ? 'bg-muted' : 'hover:bg-muted')
                          }
                        >
                          <span className='text-sm font-medium'>{cr.title}</span>
                        </NavigationMenuLink>
                      ))}
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

export default NavigationMenuDesignDemo
