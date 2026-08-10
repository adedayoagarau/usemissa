'use client'

import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperNav
} from '@/components/ui/stepper'

const steps = [
  { id: 'account', title: 'Account', description: 'Create an account' },
  { id: 'profile', title: 'Profile', description: 'Set up our profile' },
  { id: 'complete', title: 'Complete', description: 'Complete the setup' }
]

const StepperDescriptionDemo = () => {
  return (
    <Stepper steps={steps} className='flex w-full items-center'>
      <StepperNav>
        {steps.map((step, index) => (
          <StepperItem key={index} stepId={step.id} className='relative flex-1'>
            <StepperTrigger className='flex flex-col gap-2.5'>
              <StepperIndicator>{index + 1}</StepperIndicator>
              <div className='flex flex-col'>
                <StepperTitle>{step.title}</StepperTitle>
                <StepperDescription className='text-nowrap max-md:hidden'>{step.description}</StepperDescription>
              </div>
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

export default StepperDescriptionDemo
