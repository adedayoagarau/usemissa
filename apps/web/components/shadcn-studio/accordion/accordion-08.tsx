import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { PackageIcon, RefreshCwIcon, HeadsetIcon, PlusIcon } from "lucide-react"

const items = [
  {
    icon: (
      <PackageIcon
      />
    ),
    title: 'How do I track my order?',
    subtitle: 'Shipping & Delivery',
    content: `You can track your order by logging into your account and visiting the "Orders" section. You'll receive tracking information via email once your order ships. For real-time updates, you can also use the tracking number provided in your shipping confirmation email.`
  },
  {
    icon: (
      <RefreshCwIcon
      />
    ),
    title: 'What is your return policy?',
    subtitle: 'Returns & Refunds',
    content:
      'We offer a 30-day return policy for most items. Products must be unused and in their original packaging. To initiate a return, please contact our customer service team or use the return portal in your account dashboard.'
  },
  {
    icon: (
      <HeadsetIcon
      />
    ),
    title: 'How can I contact customer support?',
    subtitle: 'Help & Support',
    content:
      'Our customer support team is available 24/7. You can reach us via live chat, email at support@example.com, or by phone at 1-800-123-4567. For faster service, please have your order number ready when contacting us.'
  }
]

const AccordionIconSubtitleDemo = () => {
  return (
    <Accordion className='w-full border-0 [&>*>[data-slot="accordion-content"]]:px-0' defaultValue={['item-1']}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index + 1}`} className='bg-transparent'>
          <AccordionPrimitive.Header className='flex'>
            <AccordionPrimitive.Trigger
              data-slot='accordion-trigger'
              className='focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50'
            >
              <span className='flex items-center gap-4'>
                <span
                  className='flex size-10 shrink-0 items-center justify-center rounded-full border *:size-4'
                  aria-hidden='true'
                >
                  {item.icon}
                </span>
                <span className='flex flex-col space-y-0.5'>
                  <span>{item.title}</span>
                  <span className='text-muted-foreground font-normal'>{item.subtitle}</span>
                </span>
              </span>
              <PlusIcon className='text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 in-data-open:rotate-180 [&>path:last-child]:origin-center [&>path:last-child]:transition-all [&>path:last-child]:duration-200 in-data-open:[&>path:last-child]:rotate-90 in-data-open:[&>path:last-child]:opacity-0' />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionContent className='text-muted-foreground'>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default AccordionIconSubtitleDemo
