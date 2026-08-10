import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { PackageIcon, RefreshCwIcon, HeadsetIcon } from "lucide-react"

const items = [
  {
    icon: (
      <PackageIcon
      />
    ),
    title: 'How do I track my order?',
    content: "You'll receive tracking information via email once your order ships.",
    media: 'https://cdn.shadcnstudio.com/ss-assets/components/accordion/image-1.jpg?width=520&format=auto'
  },
  {
    icon: (
      <RefreshCwIcon
      />
    ),
    title: 'What is your return policy?',
    content: 'We offer a 30-day return policy for most items.',
    media: 'https://cdn.shadcnstudio.com/ss-assets/components/accordion/image-2.jpg?width=520&format=auto'
  },
  {
    icon: (
      <HeadsetIcon
      />
    ),
    title: 'How can I contact customer support?',
    content: 'You can reach us via live chat, email at support@example.com, or by phone at 1-800-123-4567.',
    media: 'https://cdn.shadcnstudio.com/ss-assets/components/accordion/image-3.jpg?width=520&format=auto'
  }
]

const AccordionMediaContentDemo = () => {
  return (
    <Accordion className='w-full border-0 [&>*>[data-slot="accordion-content"]]:px-0' defaultValue={['item-1']}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index + 1}`} className='bg-transparent'>
          <AccordionTrigger className='px-0'>
            <span className='flex items-center gap-4 *:[svg]:size-4 *:[svg]:shrink-0'>
              {item.icon}
              <span>{item.title}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className='h-auto space-y-4'>
            <p className='text-muted-foreground'>{item.content}</p>
            <img src={item.media} alt={item.title} className='w-full rounded-lg' />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default AccordionMediaContentDemo
