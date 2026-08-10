import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription
} from '@/components/ui/popover'
import { PencilRulerIcon } from "lucide-react"

const PopoverDimensionsDemo = () => {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' size='icon' />}>
        <PencilRulerIcon
        />
        <span className='sr-only'>Dimensions</span>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='grid gap-4'>
          <PopoverHeader className='gap-2'>
            <PopoverTitle className='leading-none'>Dimensions</PopoverTitle>
            <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
          </PopoverHeader>
          <div className='grid gap-2'>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='width'>Width</Label>
              <Input id='width' defaultValue='100%' className='col-span-2 h-8' />
            </div>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='maxWidth'>Max. width</Label>
              <Input id='maxWidth' defaultValue='300px' className='col-span-2 h-8' />
            </div>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='height'>Height</Label>
              <Input id='height' defaultValue='25px' className='col-span-2 h-8' />
            </div>
            <div className='grid grid-cols-3 items-center gap-4'>
              <Label htmlFor='maxHeight'>Max. height</Label>
              <Input id='maxHeight' defaultValue='none' className='col-span-2 h-8' />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default PopoverDimensionsDemo
