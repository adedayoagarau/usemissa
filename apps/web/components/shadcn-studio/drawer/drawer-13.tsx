import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { ShoppingCartIcon, Trash2Icon, ArrowRightIcon } from "lucide-react"

type CartItem = {
  id: string
  name: string
  description: string
  price: string
  image: string
}

interface DrawerCartProps {
  items?: CartItem[]
}

const defaultItems: CartItem[] = [
  {
    id: '1',
    name: 'Polarised sunglasses',
    description: 'Polarized sunglasses with UV protection',
    price: '$199.99',
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/shopping-cart/image-7.png'
  },
  {
    id: '2',
    name: 'Lyocell-blend bucket hat',
    description: 'Bucket hat in woven fabric made from a lyocell and nylon blend.',
    price: '$19',
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/shopping-cart/image-6.png'
  },
  {
    id: '3',
    name: 'Regular Fit Polo shirt',
    description: 'Regular fit polo shirt in breathable fabric.',
    price: '$29',
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/ecommerce/shopping-cart/image-5.png'
  }
]

const DrawerCart = ({ items = defaultItems }: DrawerCartProps) => {
  return (
    <Drawer direction='right'>
      <DrawerTrigger render={<Button variant='outline' />}><ShoppingCartIcon
                    />{' '}Cart
                  </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Cart</DrawerTitle>
        </DrawerHeader>
        <div className='no-scrollbar space-y-4 overflow-y-auto px-4'>
          {items.map((item, index) => (
            <div key={item.id}>
              {index > 0 && <Separator key={`sep-${item.id}`} className='my-4' />}
              <div key={item.id} className='space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='size-18 overflow-hidden rounded-lg border'>
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className='flex-1 space-y-2'>
                    <h4 className='font-medium'>{item.name}</h4>
                    <p className='text-muted-foreground text-sm'>{item.description}</p>
                    <p className='font-medium'>{item.price}</p>
                  </div>
                </div>
                <Button
                  variant='outline'
                  className='border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 w-full'
                >
                  <Trash2Icon
                  />
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <div className='my-4 space-y-2'>
            <div className='flex justify-between'>
              <p className='text-muted-foreground'>Subtotal</p>
              <p>$247.99</p>
            </div>
            <div className='flex justify-between'>
              <p className='text-muted-foreground'>Shipping</p>
              <p>$10.00</p>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <p className='font-medium'>Total</p>
              <p className='font-medium'>$257.99</p>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button>
            Checkout{' '}
            <ArrowRightIcon
            />
          </Button>
          <DrawerClose render={<Button variant='outline' />}>Continue Shopping</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerCart
