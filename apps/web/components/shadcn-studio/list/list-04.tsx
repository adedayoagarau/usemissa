import { CircleArrowRightIcon } from "lucide-react";

const ListIcon = () => {
  return (
    <div className='w-full max-w-sm space-y-2'>
      <ul className='space-y-3'>
        <li className='flex items-center gap-2'>
          <CircleArrowRightIcon className='size-5' />
          <p>Login to Shadcn Studio</p>
        </li>
        <li className='flex items-center gap-2'>
          <CircleArrowRightIcon className='size-5' />
          <p>Choose your desired component</p>
        </li>
        <li className='flex items-center gap-2'>
          <CircleArrowRightIcon className='size-5' />
          <p>Use and install in your project</p>
        </li>
      </ul>
    </div>
  )
}

export default ListIcon
