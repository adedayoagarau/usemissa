import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const PaginationWithIconDemo = () => {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink href='#' aria-label='Go to previous page' size='icon'>
            <ChevronLeftIcon
            />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#' isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#' aria-label='Go to next page' size='icon'>
            <ChevronRightIcon
            />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export default PaginationWithIconDemo
