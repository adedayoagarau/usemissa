import { Kbd, KbdGroup } from '@/components/ui/kbd'

const KbdDemo = () => {
  return (
    <div className='flex flex-col items-center gap-6'>
      {/* Modifier Keys */}
      <div className='flex flex-col items-center gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Modifier Keys</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>⌥</Kbd>
          <Kbd>⌃</Kbd>
        </KbdGroup>
      </div>

      {/* Another Combination */}
      <div className='flex flex-col items-center gap-2'>
        <span className='text-muted-foreground text-sm font-medium'>Open Search</span>
        <KbdGroup className='text-muted-foreground'>
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>K</Kbd>
        </KbdGroup>
      </div>
    </div>
  )
}

export default KbdDemo
