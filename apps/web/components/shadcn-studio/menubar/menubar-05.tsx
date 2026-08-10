import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from '@/components/ui/menubar'
import { DatabaseIcon, TableIcon, FilterIcon, BarChartIcon, PieChartIcon, CalculatorIcon } from "lucide-react"

const MenuBarIconsDemo = () => {
  return (
    <div className='flex flex-col items-center justify-center space-y-4'>
      <div className='text-muted-foreground text-sm font-medium'>Icons Variant - Spreadsheet App</div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Data</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <DatabaseIcon
              />
              Import Data <MenubarShortcut>⌘I</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <TableIcon
              />
              New Table
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <FilterIcon
              />
              Filter <MenubarShortcut>⌘F</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Charts</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarItem>
                <BarChartIcon
                />
                Bar Chart
              </MenubarItem>
              <MenubarItem>
                <PieChartIcon
                />
                Pie Chart
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>
                <CalculatorIcon
                />
                Formulas
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}

export default MenuBarIconsDemo
