'use client'

import { Fragment, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const items = [
  {
    id: '1',
    name: 'Philip George',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    fallback: 'PG',
    email: 'philipgeorge20@gmail.com',
    location: 'Mumbai, India',
    status: 'Active',
    balance: '$10,696.00'
  },
  {
    id: '2',
    name: 'Tiana Curtis',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    fallback: 'TC',
    email: 'tiana12@yahoo.com',
    location: 'New York, US',
    status: 'Applied',
    balance: '$0.00'
  },
  {
    id: '3',
    name: 'Jaylon Donin',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'JD',
    email: 'jaylon23d.@outlook.com',
    location: 'Washington, US',
    status: 'Active',
    balance: '$569.00'
  },
  {
    id: '4',
    name: 'Kim Yim',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
    fallback: 'KY',
    email: 'kim96@gmail.com',
    location: 'Busan, South Korea',
    status: 'Inactive',
    balance: '-$506.90'
  }
]

const COLUMNS = [
  { key: 'name', label: 'Name', defaultSize: 25 },
  { key: 'email', label: 'Email', defaultSize: 27 },
  { key: 'location', label: 'Location', defaultSize: 20 },
  { key: 'status', label: 'Status', defaultSize: 13 },
  { key: 'balance', label: 'Balance', defaultSize: 15 }
]

const DEFAULT_SIZES: Record<string, number> = Object.fromEntries(COLUMNS.map((c, i) => [String(i), c.defaultSize]))

const ResizableColumnsTable = () => {
  const [colSizes, setColSizes] = useState<Record<string, number>>(DEFAULT_SIZES)

  return (
    <div className='w-full'>
      <div className='rounded-sm border'>
        <ResizablePanelGroup
          orientation='horizontal'
          className='border-b'
          onLayoutChange={layout => setColSizes(layout)}
        >
          {COLUMNS.map((col, i) => (
            <Fragment key={col.key}>
              <ResizablePanel id={String(i)} defaultSize={col.defaultSize} minSize={120}>
                <div className='text-muted-foreground h-10 overflow-hidden px-4 py-2.5 text-sm font-medium text-ellipsis whitespace-nowrap select-none'>
                  {col.label}
                </div>
              </ResizablePanel>
              {i < COLUMNS.length - 1 && <ResizableHandle key={`handle-${col.key}`} withHandle />}
            </Fragment>
          ))}
        </ResizablePanelGroup>

        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            {COLUMNS.map((col, i) => (
              <col key={col.key} style={{ width: `${colSizes[String(i)] ?? col.defaultSize}%` }} />
            ))}
          </colgroup>
          <TableHeader className='sr-only'>
            <TableRow className='hover:bg-transparent'>
              {COLUMNS.map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className='overflow-hidden text-ellipsis whitespace-nowrap'>
                  <div className='flex items-center gap-3'>
                    <Avatar>
                      <AvatarImage src={item.src} alt={item.fallback} />
                      <AvatarFallback className='text-xs'>{item.fallback}</AvatarFallback>
                    </Avatar>
                    <div className='font-medium'>{item.name}</div>
                  </div>
                </TableCell>
                <TableCell className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.email}</TableCell>
                <TableCell className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.location}</TableCell>
                <TableCell className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.status}</TableCell>
                <TableCell className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className='text-muted-foreground mt-4 text-center text-sm'>Table with resizable columns</p>
    </div>
  )
}

export default ResizableColumnsTable
