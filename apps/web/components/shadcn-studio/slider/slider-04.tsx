import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

const SliderVerticalMultiThumbDemo = () => {
  return (
    <div className='flex w-full justify-center gap-10 py-4'>
      {/* Range Slider Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Signal Span</Label>
        <Slider defaultValue={[25, 60]} max={100} step={1} orientation='vertical' />
      </div>

      {/* Multi-Thumb Slider Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Nodes Distribution</Label>
        <Slider defaultValue={[20, 50, 80]} max={100} step={1} orientation='vertical' />
      </div>
    </div>
  )
}

export default SliderVerticalMultiThumbDemo
