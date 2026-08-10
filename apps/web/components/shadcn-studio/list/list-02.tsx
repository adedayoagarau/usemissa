import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'

import { Switch } from '@/components/ui/switch'
import { BellIcon, MailIcon, MessageSquareIcon, UserIcon } from "lucide-react"

const ListNotifications = () => {
  return (
    <div className='w-full max-w-sm space-y-4'>
      <Item variant='outline'>
        <ItemMedia variant='icon'>
          <BellIcon
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Push Notifications</ItemTitle>
          <ItemDescription>Get notified on your device</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch />
        </ItemActions>
      </Item>
      <Item variant='outline'>
        <ItemMedia variant='icon'>
          <MailIcon
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Email Notifications</ItemTitle>
          <ItemDescription>Receive updates via email</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch defaultChecked />
        </ItemActions>
      </Item>
      <Item variant='outline'>
        <ItemMedia variant='icon'>
          <MessageSquareIcon
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>SMS Notifications</ItemTitle>
          <ItemDescription>Receive updates via SMS</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch defaultChecked />
        </ItemActions>
      </Item>
      <Item variant='outline'>
        <ItemMedia variant='icon'>
          <UserIcon
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Profile Visibility</ItemTitle>
          <ItemDescription>Control who can see your profile</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch />
        </ItemActions>
      </Item>
    </div>
  )
}

export default ListNotifications
