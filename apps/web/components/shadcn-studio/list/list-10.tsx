'use client'

import * as React from 'react'

import { motion } from 'motion/react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const items = Array.from({ length: 50 }).map((_, i, a) => `item-${a.length - i}`)

const ScrollList = () => {
  return (
    <ScrollArea className='h-72 w-48 rounded-md border'>
      <div className='px-4'>
        <h4 className='bg-background sticky top-0 py-2 leading-none font-medium'>Items</h4>
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <motion.div
              className='text-sm'
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, root: undefined, amount: 0.5 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            >
              {item}
            </motion.div>
            <Separator className='my-2' />
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  )
}

export default ScrollList
