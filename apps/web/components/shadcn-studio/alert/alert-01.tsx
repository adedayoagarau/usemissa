import { Alert, AlertTitle } from '@/components/ui/alert'
import { CircleAlertIcon } from "lucide-react"

const AlertDemo = () => {
  return (
    <Alert className='*:[svg]:row-span-1'>
      <CircleAlertIcon
      />
      <AlertTitle>New message!</AlertTitle>
    </Alert>
  )
}

export default AlertDemo
