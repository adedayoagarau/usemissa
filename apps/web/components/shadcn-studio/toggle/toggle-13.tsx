import { MotionToggle } from '@/components/ui/motion-toggle'
import Heart from '@/assets/svg/heart'

const ToggleAnimatedDemo = () => {
  return (
    <MotionToggle aria-label='Toggle bookmark' particleColor='var(--destructive)'>
      <Heart className='group-data-[state=on]/toggle:fill-destructive group-data-[state=on]/toggle:stroke-destructive group-data-[state=on]/toggle:text-destructive' />
      Shadcn Studio
    </MotionToggle>
  )
}

export default ToggleAnimatedDemo
