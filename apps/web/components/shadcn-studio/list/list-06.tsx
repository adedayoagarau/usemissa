import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle
} from '@/components/ui/item'
import { UserIcon, ChevronRightIcon, ShieldIcon, CreditCardIcon } from "lucide-react"

const ListUsers = () => {
  return (
    <div className='w-full max-w-sm space-y-2'>
      <div className='mx-auto flex w-full max-w-md flex-col'>
        <ItemGroup className='gap-0'>
          <Item size='xs' render={<a href='#' />}>
            <ItemMedia variant='icon'>
              <UserIcon
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Account</ItemTitle>
              <ItemDescription>Manage your account details</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon className='text-muted-foreground size-4' />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item size='xs' render={<a href='#' />}>
            <ItemMedia variant='icon'>
              <ShieldIcon
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Privacy</ItemTitle>
              <ItemDescription>Password and two-factor auth</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon className='text-muted-foreground size-4' />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item size='xs' render={<a href='#' />}>
            <ItemMedia variant='icon'>
              <CreditCardIcon
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Payment</ItemTitle>
              <ItemDescription>Plans, invoices, and payment</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon className='text-muted-foreground size-4' />
            </ItemActions>
          </Item>
        </ItemGroup>
      </div>
    </div>
  )
}

export default ListUsers
