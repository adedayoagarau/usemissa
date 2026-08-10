'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RotateCcwIcon } from "lucide-react"

const Slider3DDemo = () => {
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [z, setZ] = useState(0)

  const handleReset = () => {
    setX(0)
    setY(0)
    setZ(0)
  }

  const handleInputChange = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)

    if (!isNaN(val)) {
      setter(Math.min(100, Math.max(-100, val)))
    }
  }

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col p-6'>
      <Label className='font-medium uppercase'>Object position</Label>

      {/* Live Visual Preview (Optimized for Bounds) */}
      <div className='relative flex h-48 items-center justify-center overflow-hidden perspective-[180px]'>
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] opacity-10' />

        {/* Shadow Projection (Reacts to position) */}
        <div
          className='bg-primary/10 absolute bottom-10 h-1 rounded-full blur-xl transition-all duration-500 ease-out'
          style={{
            width: `${40 + z / 5}px`,
            transform: `translateX(${x / 2}px) scaleX(${1 + Math.abs(y) / 100})`,
            opacity: Math.max(0, (100 - y - z) / 200)
          }}
        />

        {/* Technical Wireframe Cube Object */}
        <div
          className='relative h-16 w-16 transition-transform duration-500 ease-out transform-3d'
          style={{
            transform: `translate(${x / 2.5}%, ${y / -2.5}%) scale(${1 + z / 200}) rotateX(${y / 3}deg) rotateY(${x / 3}deg)`
          }}
        >
          {/* 3D Cube Faces */}
          <div className='absolute inset-0 transform-3d'>
            {/* Front */}
            <div className='border-primary/40 bg-primary/5 absolute inset-0 transform-[translateZ(32px)] border shadow-[0_0_15px_rgba(var(--primary),0.1)]' />
            {/* Back */}
            <div className='border-primary/40 bg-primary/5 absolute inset-0 transform-[translateZ(-32px)_rotateY(180deg)] border' />
            {/* Right */}
            <div className='border-primary/40 bg-primary/5 absolute inset-0 transform-[translateX(32px)_rotateY(90deg)] border' />
            {/* Left */}
            <div className='border-primary/40 bg-primary/5 absolute inset-0 transform-[translateX(-32px)_rotateY(-90deg)] border' />
            {/* Top */}
            <div className='border-primary/40 bg-primary/5 absolute inset-0 transform-[translateY(-32px)_rotateX(90deg)] border' />
            {/* Bottom */}
            <div className='border-primary/40 bg-primary/5 absolute inset-0 transform-[translateY(32px)_rotateX(-90deg)] border' />

            {/* Inner Core Pulse */}
            <div className='bg-primary absolute inset-4 animate-pulse rounded-full opacity-20 blur-xl' />
          </div>
        </div>
      </div>

      {/* Axis Controls */}
      <div className='flex flex-col gap-5'>
        {[
          { label: 'X', value: x, setter: setX, color: 'text-primary' },
          { label: 'Y', value: y, setter: setY, color: 'text-primary' },
          { label: 'Z', value: z, setter: setZ, color: 'text-primary' }
        ].map(axis => (
          <div key={axis.label} className='group flex items-center gap-4'>
            <div className='shrink-0 text-sm font-medium'>{axis.label}</div>
            <div className='flex-1'>
              <Slider
                value={axis.value}
                onValueChange={v => axis.setter(v as number)}
                min={-100}
                max={100}
                step={1}
                className='cursor-pointer'
                aria-label={`Position ${axis.label}`}
              />
            </div>
            <Input
              type='number'
              value={axis.value}
              onChange={handleInputChange(axis.setter)}
              className='h-8 max-w-14 text-center font-medium [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            />
          </div>
        ))}
      </div>

      {/* Primary Reset Action */}
      <Button variant='outline' onClick={handleReset} className='mt-4 w-full gap-2'>
        <RotateCcwIcon
        />
        Reset Coordinates
      </Button>
    </div>
  )
}

export default Slider3DDemo
