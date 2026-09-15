import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleAlertIcon } from "lucide-react"

const AlertSoftWarningDemo = () => {
  return (
    <Alert className='border-none bg-warning/10 text-warning dark:bg-warning/10 dark:text-warning'>
      <CircleAlertIcon
      />
      <AlertTitle>This file might be too large</AlertTitle>
      <AlertDescription className='text-warning/80 dark:text-warning/80'>
        Uploading large files may take longer or fail. Consider compressing it first.
      </AlertDescription>
    </Alert>
  )
}

export default AlertSoftWarningDemo
