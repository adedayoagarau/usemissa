import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'

type Section = {
  heading: string
  items: string[]
  checked?: string[]
}

interface DrawerSettingsProps {
  sections?: Section[]
}

const defaultSections: Section[] = [
  {
    heading: 'Notifications',
    items: ['Email notification', 'SMS', 'Messenger'],
    checked: ['Email notification']
  },
  {
    heading: 'Privacy',
    items: ['Profile visibility', 'Search engine indexing', 'Data sharing', 'Two-factor authentication'],
    checked: ['Profile visibility', 'Two-factor authentication']
  },
  {
    heading: 'Security',
    items: ['Password', 'Two-factor authentication', 'Data encryption', 'Login alerts'],
    checked: ['Two-factor authentication', 'Login alerts']
  }
]

const DrawerSettings = ({ sections = defaultSections }: DrawerSettingsProps) => {
  return (
    <Drawer direction='right'>
      <DrawerTrigger render={<Button variant='outline' />}>Manage Notifications</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className='mb-3 border-b'>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Manage your notification preferences</DrawerDescription>
        </DrawerHeader>
        <div className='space-y-6 px-4'>
          {sections.map(section => (
            <div key={section.heading} className='space-y-4'>
              <p className='text-base font-medium'>{section.heading}</p>
              <div className='space-y-2'>
                {section.items.map((item, i) => {
                  const id = `${section.heading.replace(/\s+/g, '-')}-${i}`.toLowerCase()

                  return (
                    <div key={id} className='flex items-center justify-between gap-4'>
                      <p>{item}</p>
                      <Switch id={id} defaultChecked={section.checked?.includes(item)} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerSettings
