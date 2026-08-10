'use client'

import { useState } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { ArrowBigUpIcon, StarIcon } from "lucide-react"

const ToggleTextPattern = () => {
  const [vote, setVote] = useState(false)
  const [star, setStar] = useState(false)

  return (
    <div className='flex flex-wrap items-center justify-center gap-2'>
      <Toggle variant='outline' aria-label='Like' pressed={vote} onPressedChange={setVote}>
        <ArrowBigUpIcon className='group-aria-pressed/toggle:fill-foreground' />
        Upvote {vote ? 28 : 27}
      </Toggle>
      <Toggle variant='outline' aria-label='Star' pressed={star} onPressedChange={setStar}>
        <StarIcon className='group-aria-pressed/toggle:fill-foreground' />
        Github {star ? 1262 : 1261}
      </Toggle>
    </div>
  )
}

export default ToggleTextPattern
