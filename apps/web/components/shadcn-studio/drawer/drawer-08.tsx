'use client'

import { useId, useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { MailIcon } from "lucide-react"

const maxLength = 200
const initialValue = ''

const DrawerMultiple = () => {
  const [value, setValue] = useState(initialValue)
  const [characterCount, setCharacterCount] = useState(initialValue.length)

  const id = useId()

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLength) {
      setValue(e.target.value)
      setCharacterCount(e.target.value.length)
    }
  }

  const ratings = [
    { value: '1', label: 'Angry', icon: '😡' },
    { value: '2', label: 'Sad', icon: '🙁' },
    { value: '3', label: 'Neutral', icon: '🙂' },
    { value: '4', label: 'Happy', icon: '😁' },
    { value: '5', label: 'Laughing', icon: '🤩' }
  ]

  return (
    <div className='flex flex-wrap gap-4'>
      <Drawer>
        <DrawerTrigger render={<Button variant='outline' />}>Subscribe</DrawerTrigger>
        <DrawerContent>
          <div className='mx-auto w-full max-w-sm px-4'>
            <DrawerHeader>
              <DrawerTitle>Subscribe</DrawerTitle>
              <DrawerDescription>Enter your email to subscribe to our newsletter.</DrawerDescription>
            </DrawerHeader>
            <div className='w-full max-w-sm space-y-2'>
              <Label htmlFor='email'>Enter email</Label>
              <div className='relative'>
                <Input id='email' type='email' placeholder='Email address' className='peer pr-9' />
                <div className='text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 peer-disabled:opacity-50'>
                  <MailIcon className='size-4' />
                  <span className='sr-only'>Email</span>
                </div>
              </div>
            </div>
            <DrawerFooter className='flex flex-row items-center gap-4 px-0'>
              <Button className='flex-1' type='submit'>
                Subscribe
              </Button>
              <DrawerClose render={<Button className='flex-1' variant='outline' />}>Cancel
                                          </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer>
        <DrawerTrigger render={<Button variant='outline' />}>Feedback</DrawerTrigger>
        <DrawerContent>
          <div className='mx-auto w-full max-w-sm px-4'>
            <DrawerHeader>
              <DrawerTitle>Submit feedback</DrawerTitle>
              <DrawerDescription>Help us improve our product for you</DrawerDescription>
            </DrawerHeader>
            <div className='w-full max-w-sm space-y-4'>
              <p>How would you like to describe your experience with the app today?</p>
              <RadioGroup className='flex gap-1.5' defaultValue='5'>
                {ratings.map(rating => (
                  <label
                    key={`${id}-${rating.value}`}
                    className='border-input relative flex size-9 cursor-pointer flex-col items-center justify-center rounded-full border text-center text-xl transition-[color,box-shadow] outline-none has-focus-visible:border-sky-600 has-focus-visible:ring-3 has-focus-visible:ring-sky-600/50 has-data-checked:border-sky-600 has-data-checked:bg-sky-600/10 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50 dark:has-focus-visible:border-sky-400 dark:has-focus-visible:ring-sky-600/50 dark:has-data-checked:border-sky-400 dark:has-data-checked:bg-sky-400/10'
                  >
                    <RadioGroupItem
                      id={`${id}-${rating.value}`}
                      value={rating.value}
                      className='sr-only absolute after:absolute after:inset-0'
                    />
                    {rating.icon}
                  </label>
                ))}
              </RadioGroup>
              <div className='grid grow gap-3'>
                <Textarea
                  placeholder='Type your message here.'
                  id='message-2'
                  required
                  value={value}
                  maxLength={maxLength}
                  onChange={handleChange}
                />
                <p className='text-muted-foreground text-xs'>
                  <span className='tabular-nums'>{maxLength - characterCount}</span> characters left
                </p>
              </div>
              <div className='flex gap-3'>
                <Checkbox id='terms' />
                <Label htmlFor='terms'>I consent to Shadcn Studio contacting me based on my feedback</Label>
              </div>
            </div>
            <DrawerFooter className='mt-3 gap-2 px-0'>
              <Button type='submit'>Submit</Button>
              <DrawerClose render={<Button variant='outline' />}>Cancel</DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer>
        <DrawerTrigger render={<Button variant='outline' />}>Contact</DrawerTrigger>
        <DrawerContent>
          <div className='mx-auto w-full max-w-sm px-4'>
            <DrawerHeader>
              <DrawerTitle>Contact Us</DrawerTitle>
              <DrawerDescription>Fill in your details and we will get back to you</DrawerDescription>
            </DrawerHeader>
            <div className='space-y-4'>
              <div className='w-full max-w-sm space-y-2'>
                <Label htmlFor='name'>Name</Label>
                <Input id='name' type='text' placeholder='Your name' />
              </div>
              <div className='w-full max-w-sm space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' type='email' placeholder='Your email' />
              </div>
              <div className='w-full max-w-sm space-y-2'>
                <Label htmlFor='message'>Message</Label>
                <Textarea placeholder='Type your feedback here' id='message' />
              </div>
            </div>
            <DrawerFooter className='flex flex-row items-center gap-4 px-0'>
              <Button className='flex-1' type='submit'>
                Subscribe
              </Button>
              <DrawerClose render={<Button className='flex-1' variant='outline' />}>Cancel
                                          </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default DrawerMultiple
