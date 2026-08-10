import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger
} from '@/components/ui/menubar'

const MenuBarSubMenuDemo = () => {
  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='text-muted-foreground text-sm font-medium'>Submenu Variant - Drawing App</div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Brushes</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Paintbrush</MenubarItem>
                <MenubarItem>Eraser</MenubarItem>
                <MenubarItem>Spray</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>
              Select <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Colors</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Primary <MenubarShortcut>⌘1</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Secondary <MenubarShortcut>⌘2</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Palette</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Red</MenubarItem>
                <MenubarItem>Blue</MenubarItem>
                <MenubarItem>Green</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Fill</MenubarItem>
            <MenubarItem>Stroke</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

export default MenuBarSubMenuDemo
