'use client'

import { useState } from 'react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleAlertIcon, XIcon } from "lucide-react"

const AlertGradientDemo = () => {
  const [isActive, setIsActive] = useState(true)

  if (!isActive) return null

  return (
    <Alert className='border-accent-foreground/20 from-accent text-accent-foreground bg-linear-to-b to-transparent to-60%'>
      <CircleAlertIcon
      />
      <AlertTitle>Verify your email to activate your account</AlertTitle>
      <AlertDescription className='text-accent-foreground/60'>
        We&apos;ve sent a confirmation link to your inbox. Check your email to complete the sign-up.
      </AlertDescription>
      <AlertAction>
        <button className='cursor-pointer' onClick={() => setIsActive(false)}>
          <XIcon className='size-4' />
          <span className='sr-only'>Close</span>
        </button>
      </AlertAction>
    </Alert>
  )
}

export default AlertGradientDemo
