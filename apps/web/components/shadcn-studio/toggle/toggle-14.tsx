'use client'

import { useState } from 'react'

import { AnimatePresence, motion } from 'motion/react'
import { Toggle } from '@/components/ui/toggle'
import { MoonIcon, SunIcon } from "lucide-react"

const iconVariants = {
  initial: { opacity: 0, rotate: -90, scale: 0.5 },
  animate: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 15 }
  },
  exit: {
    opacity: 0,
    rotate: 90,
    scale: 0.5,
    transition: { duration: 0.15, ease: 'easeIn' as const }
  }
}

const MotionThemeToggle = () => {
  const [isDark, setIsDark] = useState(false)

  return (
    <Toggle
      aria-label='theme toggle'
      pressed={isDark}
      onPressedChange={setIsDark}
      className='bg-transparent hover:bg-transparent aria-pressed:bg-transparent'
    >
      <AnimatePresence mode='wait' initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          variants={iconVariants}
          initial='initial'
          animate='animate'
          exit='exit'
          className='flex items-center justify-center'
        >
          {isDark ? (
            <MoonIcon className='size-6' />
          ) : (
            <SunIcon className='size-6' />
          )}
        </motion.span>
      </AnimatePresence>
    </Toggle>
  )
}

export default MotionThemeToggle
