import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Item, ItemContent, ItemTitle } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'

const ListProgress = () => {
  return (
    <div className='w-full space-y-4'>
      <Card className='pt-0'>
        <CardHeader className='bg-muted p-2'>
          <span className='inline-flex w-fit shrink-0 items-center justify-center gap-1 px-2 py-0.5 text-sm font-medium whitespace-nowrap'>
            <span className='size-2 rounded-full bg-green-600 dark:bg-green-400' aria-hidden='true' />
            In Progress
          </span>
        </CardHeader>
        <CardContent className='space-y-2'>
          <Item variant='outline'>
            <ItemContent className='space-y-1'>
              <ItemTitle>Productive B2C smart contracts</ItemTitle>
              <div className='flex items-center justify-between gap-2'>
                <Progress value={80} className='flex-1 **:data-[slot=progress-track]:h-2'></Progress>
                <span className='text-muted-foreground text-xs'>80%</span>
              </div>
            </ItemContent>
          </Item>
          <Item variant='outline'>
            <ItemContent className='space-y-1'>
              <ItemTitle>Repurpose proactive strategies</ItemTitle>
              <div className='flex items-center justify-between gap-2'>
                <Progress value={25} className='flex-1 **:data-[slot=progress-track]:h-2'></Progress>
                <span className='text-muted-foreground text-xs'>25%</span>
              </div>
            </ItemContent>
          </Item>
          <Item variant='outline'>
            <ItemContent className='space-y-1'>
              <ItemTitle>Leverage virtual architecture</ItemTitle>
              <div className='flex items-center justify-between gap-2'>
                <Progress value={65} className='flex-1 **:data-[slot=progress-track]:h-2'></Progress>
                <span className='text-muted-foreground text-xs'>65%</span>
              </div>
            </ItemContent>
          </Item>
          <Item variant='outline'>
            <ItemContent className='space-y-1'>
              <ItemTitle>Enhance best-of-breed solutions</ItemTitle>
              <div className='flex items-center justify-between gap-2'>
                <Progress value={75} className='flex-1 **:data-[slot=progress-track]:h-2'></Progress>
                <span className='text-muted-foreground text-xs'>75%</span>
              </div>
            </ItemContent>
          </Item>
        </CardContent>
        <CardHeader className='bg-muted rounded-none p-2'>
          <span className='inline-flex w-fit shrink-0 items-center justify-center gap-1 px-2 py-0.5 text-sm font-medium whitespace-nowrap'>
            <span className='size-2 rounded-full bg-amber-600 dark:bg-amber-400' aria-hidden='true' />
            In Planned
          </span>
        </CardHeader>
        <CardContent className='space-y-2'>
          <Item variant='outline'>
            <ItemContent className='space-y-1'>
              <ItemTitle>Admin Dashboard</ItemTitle>
              <div className='flex items-center justify-between gap-2'>
                <Progress value={0} className='flex-1 **:data-[slot=progress-track]:h-2'></Progress>
                <span className='text-muted-foreground text-xs'>0%</span>
              </div>
            </ItemContent>
          </Item>
          <Item variant='outline'>
            <ItemContent className='space-y-1'>
              <ItemTitle>Full Template Support</ItemTitle>
              <div className='flex items-center justify-between gap-2'>
                <Progress value={0} className='flex-1 **:data-[slot=progress-track]:h-2'></Progress>
                <span className='text-muted-foreground text-xs'>0%</span>
              </div>
            </ItemContent>
          </Item>
        </CardContent>
      </Card>
    </div>
  )
}

export default ListProgress
