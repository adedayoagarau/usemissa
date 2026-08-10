import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react"

const ToggleDemo = () => {
  return (
    <ToggleGroup variant='outline' multiple spacing={0}>
      <ToggleGroupItem value='bold' aria-label='Toggle bold'>
        <BoldIcon
        />
      </ToggleGroupItem>
      <ToggleGroupItem value='italic' aria-label='Toggle italic'>
        <ItalicIcon
        />
      </ToggleGroupItem>
      <ToggleGroupItem value='strikethrough' aria-label='Toggle strikethrough'>
        <UnderlineIcon
        />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default ToggleDemo
