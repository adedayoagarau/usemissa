import { Alert, AlertAction, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CircleAlertIcon, ArrowRightIcon } from "lucide-react"

const AlertWithLinkDemo = () => {
  return (
    <Alert className='border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 *:[svg]:row-span-1'>
      <CircleAlertIcon
      />
      <AlertTitle>New message!</AlertTitle>
      <AlertAction className='top-1/2 -translate-y-1/2'>
        <Button
          variant='outline'
          size='xs'
          className='cursor-pointer border-sky-600 text-sky-600! hover:bg-sky-600/10 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:border-sky-400 dark:text-sky-400! dark:hover:bg-sky-400/10 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/40'
          render={<a href='#' />}
          nativeButton={false}
        >
          Link
          <ArrowRightIcon
          />
        </Button>
      </AlertAction>
    </Alert>
  )
}

export default AlertWithLinkDemo
