import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarGroup,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from '@/components/ui/menubar'

const MenuBarLabelDemo = () => {
  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='text-muted-foreground text-sm font-medium'>Label Variant - Address Book</div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Contacts</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarLabel>Recent</MenubarLabel>
              <MenubarItem>
                John Doe <MenubarShortcut>⌘1</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                Jane Smith <MenubarShortcut>⌘2</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel>Favorites</MenubarLabel>
              <MenubarItem>
                Alice Johnson <MenubarShortcut>⌘3</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                Bob Wilson <MenubarShortcut>⌘4</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>
                Add Contact <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Groups</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarLabel>Work</MenubarLabel>
              <MenubarItem>Team A</MenubarItem>
              <MenubarItem>Team B</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel>Personal</MenubarLabel>
              <MenubarItem>Family</MenubarItem>
              <MenubarItem>Friends</MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

export default MenuBarLabelDemo
