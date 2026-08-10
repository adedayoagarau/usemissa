import { Kbd } from '@/components/ui/kbd'
import { ArrowUpIcon, ArrowLeftIcon, ArrowRightIcon, ArrowDownIcon } from "lucide-react"

const KbdSpecialKeyDemo = () => {
  return (
    <div className='flex flex-col items-center gap-6'>
      {/* Arrow keys */}
      <div className='w-full'>
        <span className='text-muted-foreground mb-2 block text-sm font-medium'>Arrow Keys</span>
        <div className='flex items-center justify-center'>
          <div className='grid grid-cols-3 gap-2'>
            <div />
            <div className='flex items-center justify-center'>
              <Kbd className='size-6'>
                <ArrowUpIcon
                />
              </Kbd>
            </div>
            <div />

            <div className='flex items-center justify-center'>
              <Kbd className='size-6'>
                <ArrowLeftIcon
                />
              </Kbd>
            </div>
            <div className='flex items-center justify-center'>
              <Kbd className='size-6'>●</Kbd>
            </div>
            <div className='flex items-center justify-center'>
              <Kbd className='size-6'>
                <ArrowRightIcon
                />
              </Kbd>
            </div>

            <div />
            <div className='flex items-center justify-center'>
              <Kbd className='size-6'>
                <ArrowDownIcon
                />
              </Kbd>
            </div>
            <div />
          </div>
        </div>
      </div>

      {/* Number keys row */}
      <div className='w-full'>
        <span className='text-muted-foreground mb-2 block text-sm font-medium'>Number Keys</span>
        <div className='flex flex-wrap gap-2'>
          <Kbd>0</Kbd>
          <Kbd>1</Kbd>
          <Kbd>2</Kbd>
          <Kbd>3</Kbd>
          <Kbd>4</Kbd>
          <Kbd>5</Kbd>
          <Kbd>6</Kbd>
          <Kbd>7</Kbd>
          <Kbd>8</Kbd>
          <Kbd>9</Kbd>
        </div>
      </div>
    </div>
  )
}

export default KbdSpecialKeyDemo
