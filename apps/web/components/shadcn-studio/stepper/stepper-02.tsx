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

const steps = [
  { id: 'details', title: 'Details' },
  { id: 'confirm', title: 'Confirm' },
  { id: 'done', title: 'Done' }
]

const StepperLabelDemo = () => {
  return (
    <Stepper steps={steps} className='flex items-center max-md:w-xs md:w-full md:max-w-3xl'>
      <StepperNav>
        {steps.map((step, index) => (
          <StepperItem key={index} stepId={step.id} className='relative flex-1'>
            <StepperTrigger className='flex flex-col gap-2.5'>
              <StepperIndicator>{index + 1}</StepperIndicator>
              <StepperTitle>{step.title}</StepperTitle>
            </StepperTrigger>
            {steps.length > index + 1 && (
              <StepperSeparator className='absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]' />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  )
}

export default StepperLabelDemo
