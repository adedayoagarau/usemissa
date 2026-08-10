'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import BadgeCheck from '@/assets/svg/badge-check'
import Heart from '@/assets/svg/heart'
import { UserPlusIcon, EllipsisIcon, MessageCircleIcon, RepeatIcon, SendIcon } from "lucide-react"

const CardTweetDemo = () => {
  const [liked, setLiked] = useState<boolean>(true)

  return (
    <Card className='max-w-md'>
      <CardHeader className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <Avatar className='ring-ring ring-2'>
            <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
            <AvatarFallback className='text-xs'>PG</AvatarFallback>
          </Avatar>
          <div className='flex flex-col gap-0.5'>
            <CardTitle className='flex items-center gap-1 text-sm'>
              Philip George <BadgeCheck className='text-background size-4 fill-sky-600 dark:fill-sky-400' />
            </CardTitle>
            <CardDescription>@philip20</CardDescription>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm'>
            <UserPlusIcon
            />
            Follow
          </Button>
          <Button variant='ghost' size='icon' aria-label='Toggle menu'>
            <EllipsisIcon
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-6 text-sm'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/components/card/image-6.png?width=350&format=auto'
          alt='Banner'
          className='aspect-video w-full rounded-md object-cover'
        />
        <p>
          Lost in the colors of the night 🌌✨ Sometimes the blur reveals more than clarity.{' '}
          <a href='#' className='text-sky-600 dark:text-sky-400'>
            #AbstractVibes
          </a>{' '}
          <a href='#' className='text-sky-600 dark:text-sky-400'>
            #Dreamscape
          </a>{' '}
          <a href='#' className='text-sky-600 dark:text-sky-400'>
            #VisualPoetry
          </a>
        </p>
      </CardContent>
      <CardFooter className='flex items-center gap-1'>
        <Button
          variant='ghost'
          size='sm'
          className='hover:bg-primary/10 dark:hover:bg-primary/20'
          onClick={() => setLiked(!liked)}
        >
          {liked ? <Heart className='fill-destructive stroke-destructive' /> : <Heart />}
          2.1K
        </Button>
        <Button variant='ghost' size='sm' className='hover:bg-primary/10 dark:hover:bg-primary/20'>
          <MessageCircleIcon
          />
          1.4K
        </Button>
        <Button variant='ghost' size='sm' className='hover:bg-primary/10 dark:hover:bg-primary/20'>
          <RepeatIcon
          />
          669
        </Button>
        <Button variant='ghost' size='sm' className='hover:bg-primary/10 dark:hover:bg-primary/20'>
          <SendIcon
          />
          1.1K
        </Button>
      </CardFooter>
    </Card>
  )
}

export default CardTweetDemo
