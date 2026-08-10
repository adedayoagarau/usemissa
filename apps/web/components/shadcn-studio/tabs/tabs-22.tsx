import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookIcon, HeartIcon, GiftIcon } from "lucide-react"

const tabs = [
  {
    name: 'Explore',
    value: 'explore',
    icon: (
      <BookIcon
      />
    ),
    content: (
      <>
        Discover <span className='text-foreground font-semibold'>fresh ideas</span>, trending topics, and hidden gems
        curated just for you. Start exploring and let your curiosity lead the way!
      </>
    )
  },
  {
    name: 'Favorites',
    value: 'favorites',
    icon: (
      <HeartIcon
      />
    ),
    content: (
      <>
        All your <span className='text-foreground font-semibold'>favorites</span> are saved here. Revisit articles,
        collections, and moments you love, any time you want a little inspiration.
      </>
    )
  },
  {
    name: 'Surprise Me',
    value: 'surprise',
    icon: (
      <GiftIcon
      />
    ),
    content: (
      <>
        <span className='text-foreground font-semibold'>Surprise!</span> Here&apos;s something unexpected - a fun fact,
        a quirky tip, or a daily challenge. Come back for a new surprise every day!
      </>
    )
  }
]

const TabsVerticalWithIconDemo = () => {
  return (
    <div className='w-full max-w-md'>
      <Tabs defaultValue='explore' orientation='vertical'>
        <TabsList className='h-full'>
          {tabs.map(({ icon, name, value }) => (
            <TabsTrigger key={value} value={value} className='w-full gap-1.5 px-2.5 sm:px-3'>
              {icon}
              {name}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <p className='text-muted-foreground text-sm'>{tab.content}</p>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default TabsVerticalWithIconDemo
