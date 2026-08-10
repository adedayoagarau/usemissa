import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { ChevronRightIcon } from "lucide-react"

const HoverCardMediaDemo = () => {
  return (
    <HoverCard>
      <HoverCardTrigger delay={0} closeDelay={0} render={<Button variant='link'>Hover Card Media</Button>} />
      <HoverCardContent>
        <div className='space-y-2'>
          <img
            src='https://lp-cms-production.imgix.net/2021-01/GettyRF_450207051.jpg?width=232'
            alt='Content'
            className='w-full rounded'
          />
          <div className='space-y-1'>
            <p className='text-sm font-medium'>About Himalayas</p>
            <p className='text-muted-foreground text-xs'>
              The Great Himalayan mountain ranges in the Indian sub-continent region.{' '}
              <a
                href='https://en.wikipedia.org/wiki/Himalayas'
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-foreground flex w-fit underline'
              >
                Read more
                <ChevronRightIcon className='size-4' />
              </a>
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export default HoverCardMediaDemo
