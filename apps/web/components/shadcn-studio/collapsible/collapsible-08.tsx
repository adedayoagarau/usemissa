'use client'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { UserIcon, SettingsIcon, ChevronRightIcon, CircleSmallIcon, UsersIcon, LogOutIcon } from "lucide-react"

const CollapsibleDropdownMenuDemo = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline'>Dropdown with collapsible</Button>} />
      <DropdownMenuContent className='w-56'>
        <DropdownMenuItem>
          <UserIcon
          />
          <span>Profile</span>
        </DropdownMenuItem>
        <Collapsible render={<DropdownMenuGroup></DropdownMenuGroup>}>
          <CollapsibleTrigger
            render={
              <DropdownMenuItem closeOnClick={false} className='justify-between'>
                <div className='flex items-center gap-2'>
                  <SettingsIcon
                  />
                  <span>Settings</span>
                </div>
                <ChevronRightIcon className='shrink-0 transition-transform in-data-closed:rotate-0 in-data-open:rotate-90' />
              </DropdownMenuItem>
            }
          />
          <CollapsibleContent className='pl-4'>
            <DropdownMenuItem>
              <CircleSmallIcon
              />
              <span>Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CircleSmallIcon
              />
              <span>Security</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CircleSmallIcon
              />
              <span>Billing & plans</span>
            </DropdownMenuItem>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible className='group' render={<DropdownMenuGroup></DropdownMenuGroup>}>
          <DropdownMenuGroup>
            <CollapsibleTrigger
              render={
                <DropdownMenuItem closeOnClick={false} className='justify-between'>
                  <div className='flex items-center gap-2'>
                    <UsersIcon
                    />
                    <span>Users</span>
                  </div>
                  <ChevronRightIcon className='shrink-0 transition-transform in-data-closed:rotate-0 in-data-open:rotate-90' />
                </DropdownMenuItem>
              }
            />
            <CollapsibleContent className='pl-4'>
              <DropdownMenuItem>
                <CircleSmallIcon
                />
                <span>Teams</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CircleSmallIcon
                />
                <span>Projects</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CircleSmallIcon
                />
                <span>Connections</span>
              </DropdownMenuItem>
            </CollapsibleContent>
          </DropdownMenuGroup>
        </Collapsible>
        <DropdownMenuItem>
          <LogOutIcon
          />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CollapsibleDropdownMenuDemo
