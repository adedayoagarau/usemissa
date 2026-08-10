import { Separator } from '@/components/ui/separator'

const ItemsList = () => {
  return (
    <div className='w-full max-w-sm space-y-2'>
      <dl className='flex items-center justify-between'>
        <dt>Item 1</dt>
        <dd className='text-muted-foreground'>Value 1</dd>
      </dl>
      <Separator />
      <dl className='flex items-center justify-between'>
        <dt>Item 2</dt>
        <dd className='text-muted-foreground'>Value 2</dd>
      </dl>
      <Separator />
      <dl className='flex items-center justify-between'>
        <dt>Item 3</dt>
        <dd className='text-muted-foreground'>Value 3</dd>
      </dl>
    </div>
  )
}

export default ItemsList
