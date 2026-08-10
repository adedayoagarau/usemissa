import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { FileIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react"

type FileTreeItem = {
  name: string
} & (
  | {
      type: 'file'
      children?: never
    }
  | {
      type: 'folder'
      children: FileTreeItem[]
    }
)

const fileTree: FileTreeItem[] = [
  {
    name: 'components',
    type: 'folder',
    children: [
      {
        name: 'ui',
        type: 'folder',
        children: [
          { name: 'button.tsx', type: 'file' },
          { name: 'input.tsx', type: 'file' },
          { name: 'sidebar.tsx', type: 'file' }
        ]
      },
      { name: 'app-sidebar.tsx', type: 'file' }
    ]
  },
  {
    name: 'hooks',
    type: 'folder',
    children: [{ name: 'use-mobile.ts', type: 'file' }]
  },
  {
    name: 'lib',
    type: 'folder',
    children: [{ name: 'utils.ts', type: 'file' }]
  },
  {
    name: 'components.json',
    type: 'file'
  }
]

const FileTreeItem = ({ item, level }: { level: number; item: FileTreeItem }) => {
  if (item.type === 'file') {
    return (
      <div
        className='focus-visible:ring-ring/50 flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-[3px]'
        style={{ paddingLeft: `${level === 0 ? 1.75 : 3.25}rem` }}
      >
        <FileIcon className='size-4 shrink-0' />
        <span className='text-sm'>{item.name}</span>
      </div>
    )
  }

  return (
    <Collapsible className='flex flex-col gap-1.5' style={{ paddingLeft: `${level === 0 ? 0 : 1.5}rem` }}>
      <CollapsibleTrigger className='focus-visible:ring-ring/50 flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-[3px]'>
        <ChevronRightIcon className='size-4 shrink-0 transition-transform in-data-closed:rotate-0 in-data-open:rotate-90' />
        <FolderIcon className='size-4 shrink-0 in-data-closed:block in-data-open:hidden' />
        <FolderOpenIcon className='in-data-open:block: size-4 shrink-0 in-data-closed:hidden' />
        <span className='text-sm'>{item.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className='flex flex-col gap-1.5'>
        {item.children.map(child => (
          <FileTreeItem key={child.name} item={child} level={level + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

const DrawerFileTree = () => {
  return (
    <Drawer direction='left'>
      <DrawerTrigger render={<Button variant='outline' size='icon' className='relative' />}><FileIcon
                    /></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>File Tree</DrawerTitle>
        </DrawerHeader>
        <div className='flex flex-col gap-2 p-4'>
          {fileTree.map(item => (
            <FileTreeItem key={item.name} item={item} level={0} />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerFileTree
