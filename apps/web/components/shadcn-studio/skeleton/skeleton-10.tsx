'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserRoundPlusIcon } from "lucide-react"

const users = [
  {
    delay: 3000,
    fallback: 'SJ',
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    name: 'Sarah Johnson',
    role: 'Design Engineer'
  },
  {
    delay: 4000,
    fallback: 'MA',
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    name: 'Mark  Andersson',
    role: 'Product Designer'
  },
  {
    delay: 5000,
    fallback: 'AR',
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    name: 'Alex Rivera',
    role: 'UI/UX Designer'
  }
]

function UserCard({ delay, user }: { delay: number; user: (typeof users)[0] }) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!isLoaded) {
    return <UserCardSkeleton />
  }

  return (
    <>
      <Avatar className='size-10'>
        <AvatarImage alt={user.name} src={user.image} />
        <AvatarFallback>{user.fallback}</AvatarFallback>
      </Avatar>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <h4 className='line-clamp-1 text-sm font-medium'>{user.name}</h4>
        <span className='text-muted-foreground truncate text-xs'>{user.role}</span>
      </div>
      <Button>
        <UserRoundPlusIcon
        />
        Follow
      </Button>
    </>
  )
}

function UserCardSkeleton() {
  return (
    <>
      <Skeleton className='size-10 rounded-full' />
      <div className='flex flex-1 flex-col'>
        <Skeleton className='my-0.5 h-4 max-w-54' />
        <Skeleton className='my-0.5 h-4 w-1/2' />
      </div>
      <Skeleton className='h-6 w-17 md:h-8 md:w-21.75' />
    </>
  )
}

const SkeletonLoading = () => {
  const [reload, setReload] = useState(0)

  function handleReload() {
    setReload(r => r + 1)
  }

  return (
    <div className='flex w-full max-w-xs flex-col gap-6'>
      {users.map(user => (
        <div className='flex items-center gap-4' key={`${user.fallback}-${reload}`}>
          <UserCard delay={user.delay} user={user} />
        </div>
      ))}
      <Button onClick={handleReload}>Reload</Button>
    </div>
  )
}

export default SkeletonLoading
