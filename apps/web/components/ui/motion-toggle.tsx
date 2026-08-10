'use client'

import * as React from 'react'

import { motion } from 'motion/react'

import { Toggle, toggleVariants } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

const PARTICLE_COUNT = 8

interface ParticleConfig {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

function generateParticles(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * (2 * Math.PI)
    const radius = 16 + Math.random() * 10

    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.75,
      size: 3 + Math.random() * 2.5,
      duration: 0.5 + Math.random() * 0.2,
      delay: i * 0.035
    }
  })
}

function ParticleBurst({ particles, color }: { particles: ParticleConfig[]; color: string }) {
  return (
    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
      <motion.div
        className='absolute inset-0 rounded-md'
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.8, 1.6], opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {particles.map(p => (
        <motion.div
          key={p.id}
          className='absolute rounded-full'
          style={{
            backgroundColor: color,
            width: p.size,
            height: p.size,
            filter: 'blur(0.5px)'
          }}
          initial={{ scale: 0, opacity: 0.6, x: 0, y: 0 }}
          animate={{
            scale: [0, 1.1, 0],
            opacity: [0.6, 0.9, 0],
            x: [0, p.x],
            y: [0, p.y]
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

type MotionToggleProps = Parameters<typeof Toggle>[0] & {
  particleColor?: string
}

function MotionToggle({
  className,
  variant = 'default',
  size = 'default',
  onPressedChange,
  children,
  particleColor = 'hsl(var(--foreground))',
  ...props
}: MotionToggleProps) {
  const [burstCount, setBurstCount] = React.useState(0)
  const particles = React.useMemo(() => generateParticles(), [])

  const handlePressedChange = React.useCallback(
    (...args: Parameters<NonNullable<MotionToggleProps['onPressedChange']>>) => {
      if (args[0]) setBurstCount(c => c + 1)
      onPressedChange?.(...args)
    },
    [onPressedChange]
  )

  const [firstChild, ...restChildren] = React.Children.toArray(children)

  return (
    <Toggle className={cn(className)} variant={variant} size={size} onPressedChange={handlePressedChange} {...props}>
      <span className='relative inline-flex items-center justify-center'>
        {firstChild}
        {burstCount > 0 && <ParticleBurst key={burstCount} particles={particles} color={particleColor} />}
      </span>
      {restChildren}
    </Toggle>
  )
}

export { MotionToggle, toggleVariants }
