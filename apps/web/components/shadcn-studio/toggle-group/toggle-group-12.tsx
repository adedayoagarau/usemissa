import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MonitorIcon, TabletIcon, SmartphoneIcon, SquareArrowOutUpRightIcon } from "lucide-react"

const ToggleGroupLayout = () => {
  return (
    <div className='flex items-center justify-center'>
      <ToggleGroup defaultValue={['2']} size='lg' variant='outline' spacing={0}>
        <ToggleGroupItem value='1' aria-label='chart line'>
          <MonitorIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='2' aria-label='chart column'>
          <TabletIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='3' aria-label='chart pie'>
          <SmartphoneIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='4' aria-label='chart scatter'>
          <SquareArrowOutUpRightIcon
          />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupLayout
