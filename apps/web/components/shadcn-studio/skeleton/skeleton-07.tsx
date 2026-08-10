import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'

const items = [
  {
    title: <Skeleton className='h-4 w-48' />,
    content: <Skeleton className='h-20 w-full' />
  },
  {
    title: <Skeleton className='h-4 w-48' />,
    content: <Skeleton className='h-20 w-full' />
  },
  {
    title: <Skeleton className='h-4 w-48' />,
    content: <Skeleton className='h-20 w-full' />
  }
]

const SkeletonAccordion = () => {
  return (
    <Accordion className='w-full' defaultValue={['item-1']}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index + 1}`}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent className='text-muted-foreground'>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default SkeletonAccordion
