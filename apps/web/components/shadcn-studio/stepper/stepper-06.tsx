'use client'

import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperNav
} from '@/components/ui/stepper'

const steps = [
  { id: '1', description: 'This is the first step' },
  { id: '2', description: 'This is the second step' },
  { id: '3', description: 'This is the third step' }
]

const StepperInlineDescriptionDemo = () => {
  return (
    <Stepper steps={steps} className='flex items-center max-md:w-xs md:w-full md:max-w-2xl'>
      <StepperNav>
        {steps.map(step => (
          <StepperItem key={step.id} stepId={step.id}>
            <StepperTrigger>
              <StepperIndicator variant='outline'>{steps.indexOf(step) + 1}</StepperIndicator>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  )
}

export default StepperInlineDescriptionDemo
