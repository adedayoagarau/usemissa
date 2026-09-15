import { Alert, AlertTitle } from '@/components/ui/alert'
import { UserCheckIcon } from "lucide-react"

const AlertIndicatorSuccessDemo = () => {
  return (
    <Alert className='rounded-md border-l-6 border-success bg-success/10 text-success dark:border-success dark:bg-success/10 dark:text-success *:[svg]:row-span-1'>
      <UserCheckIcon
      />
      <AlertTitle>Your request to join the team is approved.</AlertTitle>
    </Alert>
  )
}

export default AlertIndicatorSuccessDemo
