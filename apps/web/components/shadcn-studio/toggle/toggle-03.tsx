import { Toggle } from '@/components/ui/toggle'

const ToggleSize = () => {
  return (
    <div className='flex items-center gap-2'>
      <Toggle variant='outline' aria-label='Toggle small' size='sm'>
        Small
      </Toggle>
      <Toggle variant='outline' aria-label='Toggle default' size='default'>
        Default
      </Toggle>
      <Toggle variant='outline' aria-label='Toggle large' size='lg'>
        Large
      </Toggle>
    </div>
  )
}

export default ToggleSize
