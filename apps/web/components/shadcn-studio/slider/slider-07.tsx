import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

const SliderLabelDemo = () => {
  return (
    <div className='flex w-full max-w-xs flex-col gap-6'>
      <div className='space-y-1'>
        <Label className='text-sm font-medium'>Performance Profile</Label>
        <p className='text-muted-foreground text-xs'>Choose a balance between power and efficiency.</p>
      </div>

      <div className='space-y-4'>
        <Slider aria-label='Performance level' defaultValue={20} max={40} min={0} step={10} />
        <div
          aria-hidden='true'
          className='text-muted-foreground flex w-full items-center justify-between text-xs font-medium uppercase'
        >
          <span className='text-left'>Eco</span>
          <span className='text-center'>Balanced</span>
          <span className='text-center'>Standard</span>
          <span className='text-center'>High</span>
          <span className='text-right'>Turbo</span>
        </div>
      </div>
    </div>
  )
}

export default SliderLabelDemo
