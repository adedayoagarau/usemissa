import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCheckIcon } from "lucide-react"

const AlertOutlineSuccessDemo = () => {
  return (
    <Alert className='border-success text-success dark:border-success dark:text-success'>
      <CheckCheckIcon
      />
      <AlertTitle>Account created successfully</AlertTitle>
      <AlertDescription className='text-success/80 dark:text-success/80'>
        You are all set! You can now log in and start exploring your dashboard.
      </AlertDescription>
    </Alert>
  )
}

export default AlertOutlineSuccessDemo
