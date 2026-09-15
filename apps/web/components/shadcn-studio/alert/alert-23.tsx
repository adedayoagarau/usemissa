import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCheckIcon } from "lucide-react"

const AlertSoftSuccessDemo = () => {
  return (
    <Alert className='border-none bg-success/10 text-success dark:bg-success/10 dark:text-success'>
      <CheckCheckIcon
      />
      <AlertTitle>File uploaded successfully</AlertTitle>
      <AlertDescription className='text-success/80 dark:text-success/80'>
        Your document has been saved and is now available in your files.
      </AlertDescription>
    </Alert>
  )
}

export default AlertSoftSuccessDemo
