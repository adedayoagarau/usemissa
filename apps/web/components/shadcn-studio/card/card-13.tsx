'use client'

import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardFooter, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'

const CardTestimonialDemo = () => {
  const [yellow, setYellow] = useState(4)

  return (
    <Card className='max-w-md'>
      <CardContent>
        <p>
          Incredible time-saver! shadcn/studio has made UI development a breeze. The pre build components are not only{' '}
          <span className='bg-primary/10'>visually appealing but also highly customizable</span>, fitting seamlessly
          into my projects. With a wide array of options to choose from, I can easily match.
        </p>
      </CardContent>
      <CardFooter className='justify-between gap-3 max-sm:flex-col max-sm:items-stretch'>
        <div className='flex items-center gap-3'>
          <Avatar className='ring-ring ring-2'>
            <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
            <AvatarFallback className='text-xs'>SG</AvatarFallback>
          </Avatar>
          <div className='flex flex-col gap-0.5'>
            <CardTitle className='flex items-center gap-1 text-sm'>Sam Green</CardTitle>
            <CardDescription>@SamG11</CardDescription>
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <Rating
            size={24}
            precision={1}
            readOnly
            value={yellow}
            onValueChange={setYellow}
            variant='yellow'
            aria-label='Rating Yellow'
          />
        </div>
      </CardFooter>
    </Card>
  )
}

export default CardTestimonialDemo
