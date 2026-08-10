import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription
} from '@/components/ui/popover'
import { FileWarningIcon } from "lucide-react"

const PopoverDeleteFileDemo = () => {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' size='icon' />}>
        <FileWarningIcon
        />
        <span className='sr-only'>Delete File</span>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='flex flex-col items-center gap-4'>
          <div className='flex aspect-square size-12 items-center justify-center rounded-full bg-red-500/10'>
            <FileWarningIcon className='text-destructive size-6' />
          </div>
          <PopoverHeader className='gap-2 text-center'>
            <PopoverTitle className='text-base font-semibold text-balance'>
              Are you sure you want to delete this file?
            </PopoverTitle>
            <PopoverDescription>
              Deleting this file can affect your project and other files connection so keep in mind before making
              decision
            </PopoverDescription>
          </PopoverHeader>
          <div className='grid w-full grid-cols-2 gap-2'>
            <Button variant='secondary' size='sm'>
              Cancel
            </Button>
            <Button variant='destructive' size='sm'>
              Delete File
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default PopoverDeleteFileDemo
