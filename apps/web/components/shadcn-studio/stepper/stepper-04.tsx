'use client'

import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperNav
} from '@/components/ui/stepper'

const steps = [{ id: '1' }, { id: '2' }, { id: '3' }]

const StepperInlineLabelDemo = () => {
  return (
    <Stepper steps={steps} className='flex w-xs items-center sm:w-full sm:max-w-xl md:max-w-2xl'>
      <StepperNav>
        {steps.map(step => (
          <StepperItem key={step.id} stepId={step.id}>
            <StepperTrigger>
              <StepperIndicator>{steps.indexOf(step) + 1}</StepperIndicator>
              <StepperTitle>Step {steps.indexOf(step) + 1}</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  )
}

export default StepperInlineLabelDemo
