'use client'

import * as React from 'react'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

const SIZES = {
  sm: { TRACK_WIDTH: 24, THUMB_SIZE: 12, THUMB_STRETCH: 17 },
  md: { TRACK_WIDTH: 32, THUMB_SIZE: 16, THUMB_STRETCH: 26 },
  lg: { TRACK_WIDTH: 40, THUMB_SIZE: 20, THUMB_STRETCH: 36 }
}

const STRETCH_DURATION = 120 // ms

type Size = keyof typeof SIZES

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  size?: Size
}

function Switch({ className, size = 'md', ...props }: SwitchProps) {
  const { TRACK_WIDTH, THUMB_SIZE, THUMB_STRETCH } = SIZES[size]
  const [isChecked, setIsChecked] = React.useState(props.checked ?? props.defaultChecked ?? false)
  const [isStretching, setIsStretching] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (props.checked !== undefined) setIsChecked(props.checked)
  }, [props.checked])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStretching(true)
    const timeout = setTimeout(() => setIsStretching(false), STRETCH_DURATION)

    return () => clearTimeout(timeout)
  }, [isChecked])

  const handleCheckedChange = (checked: boolean, eventDetails: SwitchPrimitive.Root.ChangeEventDetails) => {
    setIsChecked(checked)
    props.onCheckedChange?.(checked, eventDetails)
  }

  const thumbWidth = isStretching ? THUMB_STRETCH : THUMB_SIZE
  const offsetUnchecked = 0
  const offsetChecked = TRACK_WIDTH - thumbWidth - 2

  const thumbLeft = isChecked ? offsetChecked : offsetUnchecked

  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      className={cn(
        `peer focus-visible:border-ring focus-visible:ring-ring/50 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 relative inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50`,

        // Dynamic width/height
        size === 'sm' ? 'h-3.5 w-6' : size === 'lg' ? 'h-5.5 w-10' : 'h-4.5 w-8',
        className
      )}
      checked={isChecked}
      onCheckedChange={handleCheckedChange}
      {...props}
    >
      <SwitchPrimitive.Thumb
        render={
          <motion.span
            data-slot='switch-thumb'
            className={cn(
              'bg-background dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground pointer-events-none absolute block rounded-full ring-0'
            )}
            animate={{
              width: thumbWidth,
              left: thumbLeft,
              transition: { duration: STRETCH_DURATION / 1000 }
            }}
            style={{
              height: THUMB_SIZE,
              minWidth: THUMB_SIZE,
              maxWidth: THUMB_STRETCH
            }}
          />
        }
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
