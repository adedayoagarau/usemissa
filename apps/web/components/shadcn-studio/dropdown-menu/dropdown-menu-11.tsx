import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ChevronsUpIcon, ChevronUpIcon, EqualIcon, ChevronDownIcon, ChevronsDownIcon } from "lucide-react"

const listItems = [
  {
    icon: (
      <ChevronsUpIcon
      />
    ),
    color: '*:[svg]:text-destructive',
    priority: 'Highest'
  },
  {
    icon: (
      <ChevronUpIcon
      />
    ),
    color: '*:[svg]:text-destructive/60',
    priority: 'High'
  },
  {
    icon: (
      <EqualIcon
      />
    ),
    color: '*:[svg]:text-warning dark:*:[svg]:text-warning',
    priority: 'Medium'
  },
  {
    icon: (
      <ChevronDownIcon
      />
    ),
    color: '*:[svg]:text-success/60 dark:*:[svg]:text-success/60',
    priority: 'Low'
  },
  {
    icon: (
      <ChevronsDownIcon
      />
    ),
    color: '*:[svg]:text-success dark:*:[svg]:text-success',
    priority: 'Lowest'
  }
]

const DropdownMenuBorderedMenuDemo = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline'>Bordered Menu</Button>} />
      <DropdownMenuContent className='w-56 shadow-none'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Task priority</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          {listItems.map((item, index) => (
            <DropdownMenuItem key={index}>
              <span className={item.color}>{item.icon}</span>
              {item.priority}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownMenuBorderedMenuDemo
