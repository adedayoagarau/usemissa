import { RotateCwIcon, LoaderPinwheelIcon, RefreshCcwIcon } from "lucide-react";

const SpinnerIconDemo = () => {
  return (
    <div className='flex items-center gap-6'>
      <RotateCwIcon role='status' aria-label='Loading' className='size-6 animate-spin' />
      <LoaderPinwheelIcon role='status' aria-label='Loading' className='size-6 animate-spin' />
      <RefreshCcwIcon role='status' aria-label='Loading' className='direction-[reverse] size-6 animate-spin' />
    </div>
  )
}

export default SpinnerIconDemo
