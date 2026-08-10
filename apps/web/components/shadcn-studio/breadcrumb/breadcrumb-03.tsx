import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { HomeIcon, ChevronsRightIcon, FolderIcon, FileIcon } from "lucide-react"

const BreadcrumbChevronsSeparatorDemo = () => {
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
          <BreadcrumbLink href='#' className='flex items-center gap-1'>
            <FolderIcon className='size-4' />
            Documents
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronsRightIcon
          />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage className='flex items-center gap-1'>
            <FileIcon className='inline size-4' />
            Add Document
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default BreadcrumbChevronsSeparatorDemo
