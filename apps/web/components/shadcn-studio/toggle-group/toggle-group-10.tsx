import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const ToggleGroupPricing = () => {
  return (
    <div className='flex items-center justify-center'>
      <ToggleGroup defaultValue={['basic']} variant='outline' size='lg' spacing={0}>
        <ToggleGroupItem value='basic'>Basic</ToggleGroupItem>
        <ToggleGroupItem value='elite' className='gap-2'>
          Elite
          <span className='bg-destructive text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium'>
            Save 20%
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupPricing
