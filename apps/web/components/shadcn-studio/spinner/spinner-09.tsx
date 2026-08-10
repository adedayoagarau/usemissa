import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle
} from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'

const SpinnerProcessingDemo = () => {
  return (
    <div className='flex w-full max-w-sm flex-col gap-4 rounded-md'>
      <Item className='bg-card' variant='outline'>
        <ItemMedia variant='icon'>
          <Spinner />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Processing video...</ItemTitle>
          <ItemDescription>Rendering 4K footage • 45% complete</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size='sm' variant='outline'>
            Pause
          </Button>
        </ItemActions>
        <ItemFooter>
          <Progress value={45} className='w-full' />
        </ItemFooter>
      </Item>
    </div>
  )
}

export default SpinnerProcessingDemo
