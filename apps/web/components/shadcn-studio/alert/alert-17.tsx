import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleAlertIcon } from "lucide-react"

const AlertDescriptionDemo = () => {
  return (
    <Alert>
      <CircleAlertIcon
      />
      <AlertTitle>Creating your account</AlertTitle>
      <AlertDescription>Fill in your details to get started.</AlertDescription>
    </Alert>
  )
}

export default AlertDescriptionDemo
