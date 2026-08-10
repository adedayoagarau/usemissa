'use client'

import { useId, useMemo, useState } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList
} from '@/components/ui/autocomplete'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'

const usersData = [
  // Development Team
  {
    id: 'liam-carter',
    name: 'Liam Carter',
    group: 'Development Team',
    position: 'Frontend Architect',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    status: 'Active'
  },
  {
    id: 'ava-bennett',
    name: 'Ava Bennett',
    group: 'Development Team',
    position: 'Senior Full Stack Engineer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    status: 'Active'
  },
  {
    id: 'noah-parker',
    name: 'Noah Parker',
    group: 'Development Team',
    position: 'API Developer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    status: 'Active'
  },
  {
    id: 'mia-collins',
    name: 'Mia Collins',
    group: 'Development Team',
    position: 'Cloud Infrastructure Engineer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
    status: 'Away'
  },
  {
    id: 'elijah-turner',
    name: 'Elijah Turner',
    group: 'Development Team',
    position: 'React Native Developer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    status: 'Active'
  },
  {
    id: 'sofia-mitchell',
    name: 'Sofia Mitchell',
    group: 'Development Team',
    position: 'Interaction Developer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    status: 'Active'
  },

  // Design Team
  {
    id: 'logan-reed',
    name: 'Logan Reed',
    group: 'Design Team',
    position: 'Head of Product Design',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png',
    status: 'Active'
  },
  {
    id: 'harper-flores',
    name: 'Harper Flores',
    group: 'Design Team',
    position: 'Senior UI Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png',
    status: 'Active'
  },
  {
    id: 'ethan-price',
    name: 'Ethan Price',
    group: 'Design Team',
    position: 'Experience Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-9.png',
    status: 'Active'
  },
  {
    id: 'chloe-ward',
    name: 'Chloe Ward',
    group: 'Design Team',
    position: 'Brand & Visual Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-10.png',
    status: 'Inactive'
  },

  // Marketing Team
  {
    id: 'jackson-cole',
    name: 'Jackson Cole',
    group: 'Marketing Team',
    position: 'Growth Marketing Lead',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-11.png',
    status: 'Active'
  },
  {
    id: 'ella-rivera',
    name: 'Ella Rivera',
    group: 'Marketing Team',
    position: 'Content Strategist',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-12.png',
    status: 'Active'
  },
  {
    id: 'aiden-morgan',
    name: 'Aiden Morgan',
    group: 'Marketing Team',
    position: 'Performance Marketing Manager',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-13.png',
    status: 'Active'
  },
  {
    id: 'scarlett-brooks',
    name: 'Scarlett Brooks',
    group: 'Marketing Team',
    position: 'Community & Social Lead',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-14.png',
    status: 'Away'
  }
]

function groupUsers(
  users: { id: string; name: string; group: string; position: string; avatar: string; status: string }[]
) {
  const groups: Record<string, typeof users> = {}

  users.forEach(item => {
    ;(groups[item.group] ??= []).push(item)
  })

  // Sort by status within each group (Active first, then Away, then Inactive)
  Object.keys(groups).forEach(group => {
    groups[group].sort((a, b) => {
      const statusOrder: Record<string, number> = { Active: 0, Away: 1, Inactive: 2 }

      return statusOrder[a.status] - statusOrder[b.status]
    })
  })

  const order = ['Development Team', 'Design Team', 'Marketing Team']

  return order.map(group => ({ group, items: groups[group] ?? [] }))
}

const groupedUsers = groupUsers(usersData)

const AutocompleteWithGroup = () => {
  const id = useId()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  const { contains } = AutocompletePrimitive.useFilter({ sensitivity: 'base' })

  const filteredItems = useMemo(() => {
    if (!value) return groupedUsers

    return groupedUsers
      .map(group => ({
        ...group,
        items: (group.items || []).filter(
          (item: (typeof usersData)[number]) =>
            contains(item.name || '', value) ||
            contains(item.group || '', value) ||
            contains(item.position || '', value)
        )
      }))
      .filter(group => group.items && group.items.length > 0)
  }, [value, contains])

  return (
    <div className='w-full max-w-xs'>
      <Autocomplete
        items={filteredItems}
        value={value}
        onValueChange={setValue}
        open={open}
        onOpenChange={setOpen}
        itemToStringValue={item => item.name}
        filter={null}
      >
        <div className='flex flex-col items-start gap-2'>
          <Label htmlFor={id}>Search Member</Label>
          <AutocompleteInput id={id} placeholder='Liam, Developer' />
        </div>
        {open && (
          <AutocompleteContent className='pt-0'>
            {filteredItems.length === 0 ? (
              <AutocompleteEmpty>No matching users found.</AutocompleteEmpty>
            ) : (
              <AutocompleteList className='not-empty:py-0'>
                {group => (
                  <AutocompleteGroup key={group.group} items={group.items} className='py-0'>
                    <AutocompleteGroupLabel className='bg-background text-muted-foreground sticky top-0 z-10 mr-1.5 py-2.5 text-xs font-medium'>
                      {group.group}
                    </AutocompleteGroupLabel>
                    <AutocompleteCollection>
                      {item => (
                        <AutocompleteItem key={item.id} value={item} className='flex items-center gap-2.5 rounded-lg'>
                          <Avatar className='size-9'>
                            <AvatarImage src={item.avatar} alt={item.name || 'User'} />
                            <AvatarFallback>
                              {(item.name || 'U')
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className='min-w-0 flex-1'>
                            <div className='truncate font-medium'>{item.name || 'Unknown'}</div>
                            <div className='text-muted-foreground truncate text-sm'>
                              {item.position || 'No position available'}
                            </div>
                          </div>
                        </AutocompleteItem>
                      )}
                    </AutocompleteCollection>
                  </AutocompleteGroup>
                )}
              </AutocompleteList>
            )}
          </AutocompleteContent>
        )}
      </Autocomplete>
    </div>
  )
}

export default AutocompleteWithGroup
