'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperDescription,
  StepperContent
} from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

const steps = [
  { id: 'introduction', title: 'Introduction', description: 'Welcome to the tutorial' },
  { id: 'basics', title: 'Basics', description: 'Learn the fundamentals' },
  { id: 'advanced', title: 'Advanced', description: 'Deep dive into advanced topics' },
  { id: 'practice', title: 'Practice', description: 'Apply what you learned' },
  { id: 'certification', title: 'Certification', description: 'Get your certificate' }
]

function ContentBlock({ id }: { id: string; onNext?: () => void; onPrev?: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [id])

  const contentMap: Record<string, { title: string; content: string }> = {
    introduction: {
      title: 'Welcome!',
      content:
        'This tutorial will guide you through the basics and advanced concepts. Take your time to understand each section before moving on.'
    },
    basics: {
      title: 'Fundamental Concepts',
      content:
        'In this section, we cover the core concepts that form the foundation of everything else. Make sure you understand these before proceeding.'
    },
    advanced: {
      title: 'Advanced Topics',
      content:
        "Now that you understand the basics, let's dive into more complex scenarios and edge cases that you might encounter."
    },
    practice: {
      title: 'Hands-on Practice',
      content: "Time to apply what you've learned! Complete the exercises below to solidify your understanding."
    },
    certification: {
      title: 'Congratulations!',
      content: "You've completed all the modules. Your certificate is now ready for download."
    }
  }

  const content = contentMap[id] || { title: id, content: '' }

  return (
    <div ref={ref} className='overflow-hidden transition-all duration-300'>
      <div className='bg-secondary text-secondary-foreground rounded-lg border p-4'>
        <p className='font-medium md:text-lg'>{content.title}</p>
        <p className='text-muted-foreground mt-2 max-md:text-sm'>{content.content}</p>
      </div>
    </div>
  )
}

const StepperVerticalScrollTrackDemo = () => {
  const [current, setCurrent] = useState(steps[0].id)

  const currentIndex = steps.findIndex(s => s.id === current)
  const goNext = () => setCurrent(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  const goBack = () => setCurrent(steps[Math.max(currentIndex - 1, 0)].id)

  return (
    <div className='flex items-center justify-center'>
      <Stepper steps={steps} value={current} onValueChange={setCurrent} className='w-full' orientation='vertical'>
        <div className='flex w-full flex-col gap-4'>
          {steps.map((step, index) => (
            <div key={step.id} className='group'>
              <div className='flex flex-col items-start'>
                <div className='w-64 shrink-0'>
                  <StepperItem stepId={step.id} className='justify-start'>
                    <StepperTrigger className='flex items-start gap-3'>
                      <StepperIndicator>{index + 1}</StepperIndicator>
                      <div className='ml-2 text-left'>
                        <StepperTitle>{step.title}</StepperTitle>
                        <StepperDescription>{step.description}</StepperDescription>
                      </div>
                    </StepperTrigger>
                  </StepperItem>
                </div>

                <div className='relative flex-1'>
                  <div className='ml-12'>
                    <StepperContent value={step.id}>
                      <div className='mt-2 md:w-xl xl:w-2xl'>
                        <ContentBlock id={step.id} onNext={goNext} onPrev={goBack} />
                      </div>
                    </StepperContent>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className='flex justify-end gap-4'>
            <Button onClick={goBack} variant='secondary' disabled={currentIndex === 0}>
              <ArrowLeftIcon className='size-4' />{' '}
              Previous
            </Button>

            <Button onClick={goNext} disabled={currentIndex === steps.length - 1}>
              Next{' '}
              <ArrowRightIcon className='size-4' />
            </Button>
          </div>
        </div>
      </Stepper>
    </div>
  )
}

export default StepperVerticalScrollTrackDemo
