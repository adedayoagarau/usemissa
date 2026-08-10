import { Card, CardContent, CardHeader, CardDescription, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const CardHorizontalDemo = () => {
  return (
    <Card className='max-w-lg overflow-hidden py-0 sm:flex-row sm:gap-0'>
      <CardContent className='grow px-0'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/components/card/image-3.png'
          alt='Banner'
          className='size-full'
        />
      </CardContent>
      <div className='sm:min-w-60'>
        <CardHeader className='pt-4'>
          <CardTitle>Dreamy Colorwave Gradient</CardTitle>
          <CardDescription className='mb-4'>
            A smooth blend of vibrant pinks, purples, and blues for a magical touch.
          </CardDescription>
        </CardHeader>
        <CardFooter className='gap-3 py-4'>
          <Button className='bg-transparent bg-linear-to-br from-purple-500 to-pink-500 text-white focus-visible:ring-pink-600/20'>
            Explore More
          </Button>
        </CardFooter>
      </div>
    </Card>
  )
}

export default CardHorizontalDemo
