import { Alert, AlertTitle } from '@/components/ui/alert'
import { FileWarningIcon } from "lucide-react"

const AlertAttachedIconDemo = () => {
  return (
    <Alert className='flex items-stretch gap-0 p-0'>
      <div className='bg-destructive/10 text-destructive flex items-center rounded-l-lg border-r p-2'>
        <FileWarningIcon className='size-4' />
      </div>
      <AlertTitle className='p-2'>This file contains virus!</AlertTitle>
    </Alert>
  )
}

export default AlertAttachedIconDemo
