'use client'

import { useState } from 'react'
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperNav,
  StepperTitle,
  StepperPanel,
  StepperContent
} from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

const steps = [
  { id: 'details', title: 'Step 1' },
  { id: 'review', title: 'Step 2' },
  { id: 'complete', title: 'Step 3' }
]

const StepperNonLinearDemo = () => {
  const [current, setCurrent] = useState(steps[0].id)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  const currentIndex = steps.findIndex(s => s.id === current)
  const goNext = () => setCurrent(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  const goBack = () => setCurrent(steps[Math.max(currentIndex - 1, 0)].id)

  const completeCurrent = () => {
    setCompletedSteps(prev => {
      const next = new Set(prev)

      next.add(current)

      return next
    })

    goNext()
  }

  const allCompleted = completedSteps.size === steps.length

  const handleSubmit = () => {
    setCompletedSteps(prev => {
      const next = new Set(prev)

      next.add(current)

      return next
    })

    // final submit action placeholder
    alert('Form Submitted!!')
    setSubmitted(true)
  }

  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='flex items-center justify-center'>
        <Stepper
          steps={steps}
          value={current}
          onValueChange={v => {
            if (!submitted) setCurrent(v)
          }}
          className='flex flex-col items-center justify-center gap-6'
          orientation='horizontal'
        >
          <StepperNav>
            {steps.map((step, index) => (
              <StepperItem
                key={index}
                stepId={step.id}
                className='relative flex-1'
                completed={completedSteps.has(step.id)}
              >
                <StepperTrigger
                  className={cn('flex flex-col gap-2.5', submitted ? 'pointer-events-none' : '')}
                  aria-disabled={submitted}
                >
                  <StepperIndicator
                    className={
                      submitted
                        ? 'data-[state=completed]:bg-green-600/20 data-[state=completed]:text-green-600 dark:data-[state=completed]:bg-green-400/20 dark:data-[state=completed]:text-green-400'
                        : ''
                    }
                  >
                    {index + 1}
                  </StepperIndicator>
                  <StepperTitle className={`${submitted ? 'text-muted-foreground' : ''}`}>{step.title}</StepperTitle>
                </StepperTrigger>
                {steps.length > index + 1 && (
                  <StepperSeparator
                    className={cn(
                      'absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]',
                      submitted
                        ? 'group-data-[state=completed]/step:bg-green-600/40 dark:group-data-[state=completed]/step:bg-green-400/40'
                        : ''
                    )}
                  />
                )}
              </StepperItem>
            ))}
          </StepperNav>
          <StepperPanel className='w-xs text-center text-sm sm:w-xl'>
            {steps.map(step => (
              <StepperContent key={step.id} value={step.id}>
                <div className='bg-muted border-primary/15 flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-4 md:p-8'>
                  <div className='space-y-2'>
                    <h3 className='text-muted-foreground text-lg font-medium'>{step.title}</h3>
                  </div>

                  <div className='w-full'>
                    <div className='text-muted-foreground flex h-20 items-center justify-center'>
                      {step.id === 'complete' && submitted ? (
                        <span className='text-base font-medium'>Form submitted!</span>
                      ) : (
                        <span className='text-base'>{step.title} content</span>
                      )}
                    </div>

                    <div className='mt-6 flex items-center justify-between'>
                      {!submitted && (
                        <>
                          <Button onClick={goBack} variant='default'>
                            <ArrowLeftIcon className='size-4' />{' '}
                            Back
                          </Button>

                          {allCompleted ? (
                            <Button onClick={handleSubmit} variant='default'>
                              Submit
                            </Button>
                          ) : (
                            <Button
                              onClick={completeCurrent}
                              disabled={completedSteps.has(current)}
                              variant={completedSteps.has(current) ? 'secondary' : 'default'}
                            >
                              Complete Step
                            </Button>
                          )}

                          <Button onClick={goNext}>
                            Next{' '}
                            <ArrowRightIcon className='size-4' />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </StepperContent>
            ))}
          </StepperPanel>
        </Stepper>
      </div>
      <p className='text-muted-foreground text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://flyonui.com/docs/components/progress/#with-labels-horizontal'
          target='_blank'
          rel='noopener noreferrer'
        >
          Flyon UI
        </a>
      </p>
    </div>
  )
}

export default StepperNonLinearDemo
