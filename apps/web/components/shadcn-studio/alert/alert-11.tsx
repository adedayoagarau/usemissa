import { Alert, AlertTitle } from '@/components/ui/alert'
import { UserCheckIcon } from "lucide-react"

const AlertIndicatorSuccessDemo = () => {
  return (
    <Alert className='rounded-md border-l-6 border-green-600 bg-green-600/10 text-green-600 dark:border-green-400 dark:bg-green-400/10 dark:text-green-400 *:[svg]:row-span-1'>
      <UserCheckIcon
      />
      <AlertTitle>Your request to join the team is approved.</AlertTitle>
    </Alert>
  )
}

export default AlertIndicatorSuccessDemo
