'use client'

import { useState } from 'react'

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from '@/components/ui/menubar'

const MenuBarMixedDemo = () => {
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: false,
    mentions: true
  })

  const [feedFilter, setFeedFilter] = useState('following')

  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='text-muted-foreground text-sm font-medium'>
        Mixed Interactions Variant - Social Media Dashboard
      </div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Feed</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={feedFilter} onValueChange={setFeedFilter}>
              <MenubarRadioItem value='following'>Following</MenubarRadioItem>
              <MenubarRadioItem value='trending'>Trending</MenubarRadioItem>
              <MenubarRadioItem value='latest'>Latest</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem>
              Refresh Feed <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Mark All Read</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Notifications</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem
              checked={notifications.likes}
              onCheckedChange={checked => setNotifications(prev => ({ ...prev, likes: checked }))}
            >
              Likes
            </MenubarCheckboxItem>
            <MenubarCheckboxItem
              checked={notifications.comments}
              onCheckedChange={checked => setNotifications(prev => ({ ...prev, comments: checked }))}
            >
              Comments
            </MenubarCheckboxItem>
            <MenubarCheckboxItem
              checked={notifications.follows}
              onCheckedChange={checked => setNotifications(prev => ({ ...prev, follows: checked }))}
            >
              New Followers
            </MenubarCheckboxItem>
            <MenubarCheckboxItem
              checked={notifications.mentions}
              onCheckedChange={checked => setNotifications(prev => ({ ...prev, mentions: checked }))}
            >
              Mentions
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem>Notification Settings</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Post</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New Post <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Schedule Post</MenubarItem>
            <MenubarItem>Drafts</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Media Library</MenubarItem>
            <MenubarItem>Analytics</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Account</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Profile <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Settings</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Help & Support</MenubarItem>
            <MenubarItem>Sign Out</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

export default MenuBarMixedDemo
