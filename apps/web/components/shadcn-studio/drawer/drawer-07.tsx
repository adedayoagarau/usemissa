'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

interface CustomDrawerContentProps extends React.ComponentProps<typeof DrawerContent> {
  overlayClassName?: string
}

function CustomDrawerContent({ children, overlayClassName, className, ...props }: CustomDrawerContentProps) {
  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerContent
        className={cn('bg-background h-auto text-sm', className)}
        overlayClassName={overlayClassName}
        {...props}
      >
        {children}
      </DrawerContent>
    </DrawerPortal>
  )
}

const DrawerCustomOverlay = () => {
  return (
    <Drawer direction='right'>
      <DrawerTrigger render={<Button variant='outline' />}>Custom Overlay</DrawerTrigger>
      <CustomDrawerContent overlayClassName='bg-indigo-600/20 dark:bg-indigo-400/20'>
        <DrawerHeader>
          <DrawerTitle>Drawer Title</DrawerTitle>
          <DrawerDescription>Drawer Description</DrawerDescription>
        </DrawerHeader>
        <p className='px-4'>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Impedit ducimus nulla, rem inventore sapiente
          accusantium.
        </p>
        <DrawerFooter>
          <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
        </DrawerFooter>
      </CustomDrawerContent>
    </Drawer>
  )
}

export default DrawerCustomOverlay
