'use client'

import { Field, FieldDescription } from '@/components/ui/field'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressLabelDemo = () => {
  return (
    <div className='flex w-full flex-col gap-4'>
      {/* Progress bar with percentage */}
      <Field>
        <Progress value={64} className='transition-all duration-300'>
          <ProgressLabel>Downloading...</ProgressLabel>
          <ProgressValue className='text-foreground font-medium' />
        </Progress>
        <FieldDescription>design-system-v1.zip</FieldDescription>
      </Field>

      {/* Progress bar with MB */}
      <Field>
        <Progress value={64} className='transition-all duration-300'>
          <ProgressLabel>Downloading...</ProgressLabel>
          <ProgressValue className='text-foreground font-medium'>{() => '3.4 MB / 5 MB'}</ProgressValue>
        </Progress>
        <FieldDescription>design-system-v2.zip</FieldDescription>
      </Field>
    </div>
  )
}

export default ProgressLabelDemo
