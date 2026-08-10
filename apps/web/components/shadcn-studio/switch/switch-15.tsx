import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DatabaseIcon } from "lucide-react"

const SwitchCardDemo = () => {
  const id = useId()

  return (
    <div className='border-input has-data-checked:border-primary/50 relative flex w-full items-start gap-2 rounded-md border p-4 shadow-xs outline-none'>
      <Switch id={id} size='sm' className='order-1' aria-describedby={`${id}-description`} />
      <div className='flex grow items-center gap-3'>
        <DatabaseIcon className='size-6' />
        <div className='grid grow gap-2'>
          <Label htmlFor={id}>Backup</Label>
          <p id={`${id}-description`} className='text-muted-foreground text-xs'>
            Backup every file from your project.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SwitchCardDemo
