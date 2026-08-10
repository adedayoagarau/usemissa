import { Rating } from '@/components/ui/rating'

const RatingReadOnlyDemo = () => {
  return (
    <div className='flex flex-col items-start justify-center gap-2'>
      <p className='text-start text-sm font-medium'>Read Only</p>
      <Rating readOnly size={24} precision={0.5} value={3.5} />
    </div>
  )
}

export default RatingReadOnlyDemo
