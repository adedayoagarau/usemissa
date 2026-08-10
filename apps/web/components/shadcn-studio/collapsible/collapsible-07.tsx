import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronUpIcon } from "lucide-react"

const CollapsibleCardDemo = () => {
  return (
    <Card className='w-full max-w-md pb-0'>
      <Collapsible>
        <div className='flex items-center justify-between gap-3 px-4 pb-4'>
          <CardTitle>How do I track my order?</CardTitle>
          <CardAction>
            <CollapsibleTrigger
              render={
                <Button variant='outline' size='sm'>
                  <span className='in-data-open:hidden'>Show</span>
                  <span className='in-data-closed:hidden'>Hide</span>
                  <ChevronUpIcon className='transition-transform in-data-closed:rotate-180' />
                </Button>
              }
            />
          </CardAction>
        </div>
        <CollapsibleContent>
          <CardContent className='space-y-2 px-0'>
            <p className='px-6'>You&apos;ll receive tracking information via email once your order ships.</p>
            <img
              src='https://cdn.shadcnstudio.com/ss-assets/components/accordion/image-1.jpg?width=446&format=auto'
              alt='Banner'
              className='aspect-video h-70 rounded-b-xl object-cover'
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default CollapsibleCardDemo
