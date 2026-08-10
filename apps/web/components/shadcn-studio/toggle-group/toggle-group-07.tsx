import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, MenuIcon } from "lucide-react"

const ToggleGroupAlignment = () => {
  return (
    <div className='flex items-center justify-center'>
      <ToggleGroup defaultValue={['left']} spacing={1}>
        <ToggleGroupItem value='left' aria-label='Align left'>
          <AlignLeftIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='center' aria-label='Align center'>
          <AlignCenterIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='right' aria-label='Align right'>
          <AlignRightIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='justify' aria-label='Justify'>
          <MenuIcon
          />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupAlignment
