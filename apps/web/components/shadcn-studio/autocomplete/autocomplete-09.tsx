'use client'

import type { ReactNode } from 'react'
import { useEffect, useState, useId } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus
} from '@/components/ui/autocomplete'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { LoaderCircleIcon } from "lucide-react"

const topMembers = [
  {
    id: 'liam-carter',
    name: 'Liam Carter',
    position: 'Frontend Architect',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png'
  },
  {
    id: 'ava-bennett',
    name: 'Ava Bennett',
    position: 'Senior Full Stack Engineer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png'
  },
  {
    id: 'noah-parker',
    name: 'Noah Parker',
    position: 'API Developer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png'
  },
  {
    id: 'mia-collins',
    name: 'Mia Collins',
    position: 'Cloud Infrastructure Engineer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png'
  },
  {
    id: 'elijah-turner',
    name: 'Elijah Turner',
    position: 'React Native Developer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png'
  },
  {
    id: 'sofia-mitchell',
    name: 'Sofia Mitchell',
    position: 'Interaction Developer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png'
  },
  {
    id: 'logan-reed',
    name: 'Logan Reed',
    position: 'Head of Product Design',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png'
  },
  {
    id: 'harper-flores',
    name: 'Harper Flores',
    position: 'Senior UI Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png'
  },
  {
    id: 'ethan-price',
    name: 'Ethan Price',
    position: 'Experience Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-9.png'
  },
  {
    id: 'chloe-ward',
    name: 'Chloe Ward',
    position: 'Brand & Visual Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-10.png'
  },
  {
    id: 'jackson-cole',
    name: 'Jackson Cole',
    position: 'Growth Marketing Lead',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-11.png'
  },
  {
    id: 'ella-rivera',
    name: 'Ella Rivera',
    position: 'Content Strategist',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-12.png'
  },
  {
    id: 'aiden-morgan',
    name: 'Aiden Morgan',
    position: 'Performance Marketing Manager',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-13.png'
  },
  {
    id: 'scarlett-brooks',
    name: 'Scarlett Brooks',
    position: 'Community & Social Lead',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-14.png'
  }
]

async function searchMembers(
  query: string,
  filter: (item: string, query: string) => boolean
): Promise<(typeof topMembers)[number][]> {
  // Simulate network delay
  await new Promise(resolve => {
    setTimeout(resolve, Math.random() * 800 + 200)
  })

  // Simulate occasional network errors (2% chance)
  if (Math.random() < 0.02 || query === 'error') {
    throw new Error('Network error')
  }

  return topMembers.filter(member => filter(member.name, query) || filter(member.position, query))
}

const AutocompleteWithAsync = () => {
  const id = useId()
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<(typeof topMembers)[number][]>([])
  const [error, setError] = useState<string | null>(null)

  const { contains } = AutocompletePrimitive.useFilter({ sensitivity: 'base' })

  useEffect(() => {
    if (!searchValue) {
      // Keep the generated async search state synchronized with an empty query.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)

      return undefined
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)

    let ignore = false

    async function fetchDevelopers() {
      try {
        const results = await searchMembers(searchValue, contains)

        if (!ignore) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSearchResults(results)
        }
      } catch {
        if (!ignore) {
          setError('Failed to fetch members. Please try again.')
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSearchResults([])
        }
      } finally {
        if (!ignore) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsLoading(false)
        }
      }
    }

    const timeoutId = setTimeout(fetchDevelopers, 300)

    return () => {
      clearTimeout(timeoutId)
      ignore = true
    }
  }, [searchValue, contains])

  let status: ReactNode = ''

  if (isLoading) {
    status = (
      <div className='flex items-center gap-2'>
        <LoaderCircleIcon className='size-4 animate-spin' />
        Searching members...
      </div>
    )
  } else if (error) {
    status = error
  } else if (searchResults.length === 0 && searchValue) {
    status = `No members found for "${searchValue}"`
  } else if (searchResults.length > 0) {
    status = `${searchResults.length} member${searchResults.length === 2 ? '' : 's'} found`
  } else if (!searchValue) {
    status = 'Start typing to search members...'
  }

  const shouldRenderPopup = searchValue !== ''

  return (
    <div className='w-full max-w-xs'>
      <Autocomplete
        items={searchResults}
        value={searchValue}
        onValueChange={setSearchValue}
        itemToStringValue={(item: unknown) => (item as (typeof topMembers)[number]).name}
        filter={null}
      >
        <div className='flex flex-col items-start gap-2'>
          <Label htmlFor={id}>Async Autocomplete</Label>
          <AutocompleteInput id={id} placeholder='e.g. Liam Carter, Design Team' showTrigger showClear />
        </div>
        {shouldRenderPopup && (
          <AutocompleteContent>
            <AutocompleteStatus>{status}</AutocompleteStatus>
            <AutocompleteList>
              {(member: (typeof topMembers)[number]) => (
                <AutocompleteItem key={member.id} value={member} className='rounded-lg'>
                  <div className='flex items-center gap-2.5 truncate'>
                    <Avatar className='size-9'>
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>
                        {member.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate font-medium'>{member.name}</div>
                      <div className='text-muted-foreground truncate text-sm'>{member.position}</div>
                    </div>
                  </div>
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompleteContent>
        )}
      </Autocomplete>
    </div>
  )
}

export default AutocompleteWithAsync
