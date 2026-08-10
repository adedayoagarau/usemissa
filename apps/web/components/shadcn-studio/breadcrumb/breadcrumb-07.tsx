'use client'

import { useState } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { HomeIcon, ChevronsRightIcon, FolderOpenIcon, FolderIcon } from "lucide-react"

const BreadcrumbWithIconDemo = () => {
  const [open, setOpen] = useState(false)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href='#'>
            <HomeIcon className='size-4' />
            <span className='sr-only'>Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronsRightIcon
          />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger className='flex cursor-pointer items-center gap-1'>
              {open ? (
                <FolderOpenIcon className='size-4' />
              ) : (
                <FolderIcon className='size-4' />
              )}
              <span className='sr-only'>{open ? 'Open' : 'Close'}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Documentation</DropdownMenuItem>
              <DropdownMenuItem>Themes</DropdownMenuItem>
              <DropdownMenuItem>GitHub</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronsRightIcon
          />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Add Document</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default BreadcrumbWithIconDemo
