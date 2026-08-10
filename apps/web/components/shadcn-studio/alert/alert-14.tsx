import { Alert, AlertTitle } from '@/components/ui/alert'
import { TriangleAlertIcon } from "lucide-react"

const AlertDestructiveDemo = () => {
  return (
    <Alert variant='destructive' className='*:[svg]:row-span-1'>
      <TriangleAlertIcon
      />
      <AlertTitle>Something went wrong!</AlertTitle>
    </Alert>
  )
}

export default AlertDestructiveDemo
