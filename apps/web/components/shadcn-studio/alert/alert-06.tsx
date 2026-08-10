import { Alert, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileWarningIcon } from "lucide-react"

const AlertFocusedIconDemo = () => {
  return (
    <Alert className='grid-cols-[auto_1fr] items-center gap-x-2'>
      <Avatar size='sm' className='row-span-1 rounded-sm'>
        <AvatarFallback className='bg-destructive dark:bg-destructive/60 rounded-sm text-white'>
          <FileWarningIcon className='size-3.5' />
        </AvatarFallback>
      </Avatar>
      <AlertTitle>This file contains virus!</AlertTitle>
    </Alert>
  )
}

export default AlertFocusedIconDemo
