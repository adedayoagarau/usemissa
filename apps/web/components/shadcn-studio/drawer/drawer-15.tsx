'use client'

import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose
} from '@/components/ui/drawer'
import { FingerprintPatternIcon } from "lucide-react"

const DrawerProfile = () => {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant='outline' />}>Open Drawer</DrawerTrigger>
      <DrawerContent>
        <div className='mx-auto w-full max-w-sm px-4'>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
          >
            <DrawerHeader>
              <DrawerTitle className='flex items-center justify-center gap-2'>
                <img
                  src='https://cdn.shadcnstudio.com/ss-assets/blocks/dashboard-application/dropdown/image-10.png'
                  alt='Shadcn Studio'
                  className='size-6'
                />
                <span className='text-lg font-medium'>Shadcn Studio</span>
              </DrawerTitle>
            </DrawerHeader>
          </motion.div>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.18 }}
            className='text-sm'
          >
            Accelerate your project development with ready-to-use, and fully customizable shadcn ui Components, Blocks,
            UI Kits, Boilerplates, Templates and Themes with AI Tools.
          </motion.p>
          <motion.div
            className='mt-2 flex items-center justify-center gap-2'
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.24 }}
          >
            <p className='text-xl font-medium'>$249</p>
            <div className='flex flex-col items-start'>
              <p className='text-muted-foreground text-sm line-through'>$359</p>
              <p className='text-muted-foreground text-sm'>One-time pay</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.36 }}
          >
            <DrawerFooter>
              <div className='group relative'>
                <Button className='w-full border-0 bg-linear-to-r from-indigo-500 to-pink-500 text-white'>
                  Buy Now{' '}
                  <FingerprintPatternIcon className='group-hover:animate-pulse' />
                </Button>
              </div>
              <DrawerClose render={<Button variant='outline' />}>Maybe Later</DrawerClose>
            </DrawerFooter>
          </motion.div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerProfile
