import { Alert, AlertTitle } from '@/components/ui/alert'
import { UserRoundXIcon } from "lucide-react"

const AlertIndicatorDestructiveDemo = () => {
  return (
    <Alert className='border-destructive bg-destructive/10 text-destructive rounded-none border-0 border-l-6 *:[svg]:row-span-1'>
      <UserRoundXIcon
      />
      <AlertTitle>Your request to join the team is denied.</AlertTitle>
    </Alert>
  )
}

export default AlertIndicatorDestructiveDemo
