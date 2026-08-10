import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const ToggleGroupSizes = () => {
  return (
    <div className='flex flex-col items-center justify-center gap-4'>
      <ToggleGroup variant='outline' defaultValue={['small']} size='sm' spacing={0}>
        <ToggleGroupItem value='small' aria-label='Toggle small'>
          Small
        </ToggleGroupItem>
        <ToggleGroupItem value='default' aria-label='Toggle default'>
          Default
        </ToggleGroupItem>
        <ToggleGroupItem value='large' aria-label='Toggle large'>
          Large
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup variant='outline' defaultValue={['default']} spacing={0}>
        <ToggleGroupItem value='small' aria-label='Toggle small'>
          Small
        </ToggleGroupItem>
        <ToggleGroupItem value='default' aria-label='Toggle default'>
          Default
        </ToggleGroupItem>
        <ToggleGroupItem value='large' aria-label='Toggle large'>
          Large
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup variant='outline' size='lg' defaultValue={['large']} spacing={0}>
        <ToggleGroupItem value='small' aria-label='Toggle small'>
          Small
        </ToggleGroupItem>
        <ToggleGroupItem value='default' aria-label='Toggle default'>
          Default
        </ToggleGroupItem>
        <ToggleGroupItem value='large' aria-label='Toggle large'>
          Large
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupSizes
