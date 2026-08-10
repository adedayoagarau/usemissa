import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Columns2Icon, LayoutGridIcon, ListIcon } from "lucide-react"

const ToggleGroupVertical = () => {
  return (
    <ToggleGroup variant='outline' orientation='vertical' defaultValue={['layout']} spacing={0}>
      <ToggleGroupItem value='col' aria-label='Toggle columns'>
        <Columns2Icon
        />
      </ToggleGroupItem>
      <ToggleGroupItem value='layout' aria-label='Toggle layout'>
        <LayoutGridIcon
        />
      </ToggleGroupItem>
      <ToggleGroupItem value='list' aria-label='Toggle list'>
        <ListIcon
        />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default ToggleGroupVertical
