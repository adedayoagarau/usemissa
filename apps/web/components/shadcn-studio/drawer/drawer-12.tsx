'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'

const DrawerFilter = () => {
  const brands = [
    { id: 'apple', label: 'Apple', defaultChecked: true },
    { id: 'xiaomi', label: 'Xiaomi' },
    { id: 'samsung', label: 'Samsung' },
    { id: 'oneplus', label: 'OnePlus', defaultChecked: true },
    { id: 'google', label: 'Google' },
    { id: 'sony', label: 'Sony' },
    { id: 'lg', label: 'LG' },
    { id: 'htc', label: 'HTC' }
  ]

  const batteries = [
    { id: '6000', label: '> 6000 mAh', defaultChecked: true },
    { id: '5000-6000', label: '5000 mAh - 6000 mAh' },
    { id: '4000-5000', label: '4000 mAh - 5000 mAh' }
  ]

  return (
    <Drawer direction='right'>
      <DrawerTrigger render={<Button variant='outline' />}>Filter</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className='mb-3 border-b'>
          <DrawerTitle>Filter</DrawerTitle>
        </DrawerHeader>
        <div className='space-y-4'>
          {/* Price Range */}
          <div className='space-y-4 px-4'>
            <Label className='text-xl font-medium'>Price</Label>
            <Input type='text' placeholder='Min' className='w-full' defaultValue={10000} />
            <Input type='text' placeholder='Max' className='w-full' defaultValue={22000} />
          </div>

          <Separator />

          <div className='space-y-4 px-4'>
            <Label className='text-xl font-medium'>Sort By</Label>
            <RadioGroup defaultValue='all'>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='all' id='all' />
                <Label htmlFor='all'>All</Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='most-loved' id='most-loved' />
                <Label htmlFor='most-loved'>Most Loved</Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='new' id='new' />
                <Label htmlFor='new'>New</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className='space-y-4 px-4'>
            <Label className='text-xl font-medium'>Brands</Label>
            {brands.map(brand => (
              <div key={brand.id} className='flex items-center gap-2'>
                <Checkbox id={brand.id} defaultChecked={brand.defaultChecked} />
                <Label htmlFor={brand.id}>{brand.label}</Label>
              </div>
            ))}
          </div>

          <Separator />
          <div className='space-y-4 px-4'>
            <Label className='text-xl font-medium'>Battery</Label>
            {batteries.map(battery => (
              <div key={battery.id} className='flex items-center gap-2'>
                <Checkbox id={battery.id} defaultChecked={battery.defaultChecked} />
                <Label htmlFor={battery.id}>{' ' + battery.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default DrawerFilter
