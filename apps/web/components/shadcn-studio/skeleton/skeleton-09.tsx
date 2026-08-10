'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const base = 'rounded-xl transition-colors duration-500'

const SkeletonToggle = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className='w-full max-w-xs'>
      <Card>
        <CardHeader>
          {isLoaded ? (
            <div className={cn(base, 'bg-primary/70 aspect-video w-full')} />
          ) : (
            <Skeleton className={cn(base, 'aspect-video w-full')} />
          )}
        </CardHeader>
        <CardContent className='space-y-2'>
          {isLoaded ? (
            <>
              <div className={cn(base, 'bg-primary/70 h-4 w-3/4')} />
              <div className={cn(base, 'bg-primary/50 h-4 w-full')} />
              <div className={cn(base, 'bg-primary/30 h-4 w-2/3')} />
            </>
          ) : (
            <>
              <Skeleton className={cn(base, 'h-4 w-3/4')} />
              <Skeleton className={cn(base, 'h-4 w-full')} />
              <Skeleton className={cn(base, 'h-4 w-2/3')} />
            </>
          )}
          <div className='mt-2 flex justify-between'>
            {isLoaded ? (
              <>
                <div className={cn(base, 'bg-primary/70 h-8 w-20 rounded-md')} />
                <div className={cn(base, 'bg-primary/70 size-8 rounded-md')} />
              </>
            ) : (
              <>
                <Skeleton className={cn(base, 'h-8 w-20 rounded-md')} />
                <Skeleton className={cn(base, 'size-8 rounded-md')} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <div className='mt-4 flex items-center gap-2'>
        <Button className='flex-1' onClick={() => setIsLoaded(false)}>
          Hide
        </Button>
        <Button className='flex-1' onClick={() => setIsLoaded(true)}>
          Show
        </Button>
      </div>
    </div>
  )
}

export default SkeletonToggle
