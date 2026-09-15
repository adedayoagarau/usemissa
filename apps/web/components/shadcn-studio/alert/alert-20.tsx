import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleAlertIcon } from "lucide-react"

const AlertOutlineWarningDemo = () => {
  return (
    <Alert className='border-warning text-warning dark:border-warning dark:text-warning'>
      <CircleAlertIcon
      />
      <AlertTitle>Your password is too weak</AlertTitle>
      <AlertDescription className='text-warning/80 dark:text-warning/80'>
        Try using a mix of uppercase letters, numbers, and symbols for better security.
      </AlertDescription>
    </Alert>
  )
}

export default AlertOutlineWarningDemo
