import { Toggle } from '@/components/ui/toggle'

const ToggleDisable = () => {
  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='flex flex-wrap items-center gap-2 rounded-md p-2'>
        <Toggle aria-label='Toggle able'>Able</Toggle>
        <Toggle aria-label='Toggle disabled' disabled>
          Disabled
        </Toggle>
      </div>
    </div>
  )
}

export default ToggleDisable
