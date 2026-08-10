import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ChartLineIcon, ChartNoAxesColumnIcon, ChartPieIcon, ChartScatterIcon } from "lucide-react"

const ToggleGroupLayout = () => {
  return (
    <div className='flex items-center justify-center'>
      <ToggleGroup defaultValue={['2']} variant='outline' spacing={0}>
        <ToggleGroupItem value='1' aria-label='chart line'>
          <ChartLineIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='2' aria-label='chart column'>
          <ChartNoAxesColumnIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='3' aria-label='chart pie'>
          <ChartPieIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='4' aria-label='chart scatter'>
          <ChartScatterIcon
          />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupLayout
