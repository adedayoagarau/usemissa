import { ButtonGroup } from '@/components/ui/button-group'
import { RippleButton } from '@/components/ui/ripple-button'
import { InboxIcon, ArchiveIcon, SendHorizonalIcon } from "lucide-react"

const ButtonGroupRippleDemo = () => {
  return (
    <ButtonGroup>
      <RippleButton variant='outline'>
        <InboxIcon
        />
        Inbox
      </RippleButton>
      <RippleButton variant='outline'>
        <ArchiveIcon
        />
        Archived
      </RippleButton>
      <RippleButton variant='outline'>
        <SendHorizonalIcon
        />
        Sent
      </RippleButton>
    </ButtonGroup>
  )
}

export default ButtonGroupRippleDemo
