import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

const SliderDisabledDemo = () => {
  return (
    <div className='flex w-full flex-col'>
      <Label className='font-medium'>Disabled Slider</Label>
      <div className='flex w-full items-center justify-center gap-8'>
        {/* Horizontal Disabled */}
        <Slider
          defaultValue={50}
          max={100}
          step={1}
          className='group w-full max-w-50 **:data-[slot=slider-thumb]:shadow-none **:data-[slot=slider-thumb]:group-hover:ring-0 **:data-[slot=slider-thumb]:hover:ring-0'
          disabled
        />

        {/* Vertical Disabled */}
        <Slider
          defaultValue={50}
          max={100}
          step={1}
          orientation='vertical'
          className='group **:data-[slot=slider-thumb]:shadow-none **:data-[slot=slider-thumb]:group-hover:ring-0 **:data-[slot=slider-thumb]:hover:ring-0'
          disabled
        />
      </div>
    </div>
  )
}

export default SliderDisabledDemo
