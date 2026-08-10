'use client'

import { useState } from 'react'
import { Rating } from '@/components/ui/rating'
import { HeartIcon, ZapIcon, SparkleIcon } from "lucide-react"

const RatingIconDemo = () => {
  const [heart, setHeart] = useState(3)
  const [energy, setEnergy] = useState(2)
  const [sparkle, setSparkle] = useState(4)

  return (
    <div className='grid grid-cols-2 gap-6'>
      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Heart</div>
        <Rating
          size={28}
          precision={1}
          value={heart}
          icon={
            <HeartIcon
            />
          }
          onValueChange={setHeart}
          className="[&_[data-filled='false']_svg]:fill-red-500/30 [&_[data-filled='false']_svg]:stroke-red-500/10 [&_[data-filled='false']_svg]:stroke-1 [&_[data-filled='false']_svg]:text-red-500/10 [&_[data-filled='true']_svg]:stroke-1 [&_[data-filled='true']_svg]:text-red-500"
        />
      </div>

      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Energy</div>
        <Rating
          size={28}
          precision={1}
          value={energy}
          icon={
            <ZapIcon
            />
          }
          onValueChange={setEnergy}
          className="[&_[data-filled='false']_svg]:fill-transparent [&_[data-filled='false']_svg]:stroke-amber-400 [&_[data-filled='false']_svg]:stroke-[1.5px] [&_[data-filled='false']_svg]:text-amber-400 [&_[data-filled='true']_svg]:text-amber-400"
        />
      </div>

      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Sparkle</div>
        <Rating
          size={28}
          precision={1}
          value={sparkle}
          onValueChange={setSparkle}
          icon={
            <SparkleIcon
            />
          }
          className="[&_[data-filled='false']_svg]:stroke-foreground/50 [&_[data-filled='false']_svg]:text-foreground/50 [&_[data-filled='true']_svg]:text-foreground [&_[data-filled='false']_svg]:fill-transparent [&_[data-filled='false']_svg]:stroke-[1.5px] [&_[data-filled='true']_svg]:stroke-[1.5px]"
        />
      </div>
    </div>
  )
}

export default RatingIconDemo
