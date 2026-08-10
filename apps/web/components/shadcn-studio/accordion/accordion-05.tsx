import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const items = [
  {
    title: 'How do I track my order?',
    content: `You can track your order by logging into your account and visiting the "Orders" section. You'll receive tracking information via email once your order ships. For real-time updates, you can also use the tracking number provided in your shipping confirmation email.`
  },
  {
    title: 'What is your return policy?',
    content:
      'We offer a 30-day return policy for most items. Products must be unused and in their original packaging. To initiate a return, please contact our customer service team or use the return portal in your account dashboard.'
  },
  {
    title: 'How can I contact customer support?',
    content:
      'Our customer support team is available 24/7. You can reach us via live chat, email at support@example.com, or by phone at 1-800-123-4567. For faster service, please have your order number ready when contacting us.'
  }
]

const AccordionActiveItemDemo = () => {
  return (
    <Accordion className='w-full border-0 [&>*>[data-slot="accordion-content"]]:px-0' defaultValue={['item-1']}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          value={`item-${index + 1}`}
          className='bg-transparent data-open:border-amber-600 not-last:data-open:border-b-2 dark:data-open:border-amber-400'
        >
          <AccordionTrigger className='px-0 in-data-open:text-amber-600 in-data-open:**:data-[slot=accordion-trigger-icon]:text-amber-600 dark:in-data-open:text-amber-400 dark:in-data-open:**:data-[slot=accordion-trigger-icon]:text-amber-400'>
            {item.title}
          </AccordionTrigger>
          <AccordionContent className='text-muted-foreground'>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default AccordionActiveItemDemo
