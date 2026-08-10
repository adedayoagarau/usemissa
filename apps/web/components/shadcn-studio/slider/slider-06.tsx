import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

const SliderThumbsShapeDemo = () => {
  return (
    <div className='grid w-full grid-cols-1 gap-10 md:grid-cols-2'>
      {/* Square Thumb Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Square Thumb</Label>
        <Slider
          defaultValue={25}
          max={100}
          step={1}
          className='**:data-[slot=slider-thumb]:rounded **:data-[slot=slider-thumb]:border-2'
        />
      </div>

      {/* Diamond Thumb Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Diamond Thumb</Label>
        <Slider
          defaultValue={40}
          max={100}
          step={1}
          className='**:data-[slot=slider-thumb]:bg-primary **:data-[slot=slider-thumb]:border-background **:data-[slot=slider-thumb]:size-4.5 **:data-[slot=slider-thumb]:rotate-45 **:data-[slot=slider-thumb]:rounded-sm **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:shadow-none'
        />
      </div>

      {/* Ring Thumb Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Ring Thumb</Label>
        <Slider
          defaultValue={15}
          max={100}
          step={1}
          className='**:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:bg-background **:data-[slot=slider-thumb]:border-4'
        />
      </div>

      {/* Circle Thumb Slider Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Circle Thumb</Label>
        <Slider
          defaultValue={50}
          max={100}
          step={1}
          className='**:data-[slot=slider-thumb]:bg-primary **:data-[slot=slider-track]:opacity-90'
        />
      </div>

      {/* Needle Slider Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Needle Thumb</Label>
        <Slider
          defaultValue={75}
          max={100}
          step={1}
          className='**:data-[slot=slider-thumb]:border-background **:data-[slot=slider-thumb]:bg-primary **:data-[slot=slider-thumb]:h-6 **:data-[slot=slider-thumb]:w-2.5 **:data-[slot=slider-thumb]:border-[3px] **:data-[slot=slider-thumb]:shadow-none **:data-[slot=slider-thumb]:ring-offset-0'
        />
      </div>

      {/* Pill Thumb Section */}
      <div className='space-y-4'>
        <Label className='text-sm font-medium'>Pill Thumb</Label>
        <Slider
          defaultValue={40}
          max={100}
          step={1}
          className='**:data-[slot=slider-thumb]:h-3.5 **:data-[slot=slider-thumb]:w-7 **:data-[slot=slider-thumb]:rounded-full **:data-[slot=slider-thumb]:border-3'
        />
      </div>
    </div>
  )
}

export default SliderThumbsShapeDemo
