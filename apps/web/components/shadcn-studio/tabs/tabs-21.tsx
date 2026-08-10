import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

const TabsVerticalWithTooltipDemo = () => {
  return (
    <div className='w-full max-w-md'>
      <Tabs defaultValue='explore' orientation='vertical' className='gap-4'>
        <TabsList className='flex-col gap-2 group-data-vertical/tabs:h-auto'>
          {tabs.map(({ icon, name, value }) => (
            <Tooltip key={value}>
              <TooltipTrigger
                render={
                  <span className='h-[stretch]'>
                    <TabsTrigger
                      value={value}
                      className='w-full flex-col gap-1 group-data-vertical/tabs:justify-center'
                      aria-label='tab-trigger'
                    >
                      {icon}
                    </TabsTrigger>
                  </span>
                }
              />
              <TooltipContent className='px-2 py-1 text-xs' side='left'>
                {name}
              </TooltipContent>
            </Tooltip>
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

export default TabsVerticalWithTooltipDemo
