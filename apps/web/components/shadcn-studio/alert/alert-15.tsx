import { Alert, AlertTitle } from '@/components/ui/alert'
import { TriangleAlertIcon } from "lucide-react"

const AlertPureDestructiveDemo = () => {
  return (
    <Alert variant='destructive' className='border-destructive *:[svg]:row-span-1'>
      <TriangleAlertIcon
      />
      <AlertTitle>Unable to process your payment.</AlertTitle>
    </Alert>
  )
}

export default AlertPureDestructiveDemo
