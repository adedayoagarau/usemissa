import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

import DribbbleIcon from '@/assets/svg/dribbble-icon'
import FacebookIcon from '@/assets/svg/facebook-icon'
import InstagramIcon from '@/assets/svg/instagram-icon'
import TwitchIcon from '@/assets/svg/twitch-icon'

const ButtonGroupSocialDemo = () => {
  return (
    <ButtonGroup>
      <Button
        variant='outline'
        className='hover:bg-[#9146ff]/10!'
        render={<a href='#' rel='noopener noreferrer' />}
        nativeButton={false}
      >
        <TwitchIcon className='stroke-[#9146ff]' />
        <span className='sr-only'>Twitch</span>
      </Button>
      <Button
        variant='outline'
        className='hover:bg-[#EA4C89]/10!'
        render={<a href='#' rel='noopener noreferrer' />}
        nativeButton={false}
      >
        <DribbbleIcon className='stroke-[#EA4C89]' />
        <span className='sr-only'>Dribbble</span>
      </Button>
      <Button
        variant='outline'
        className='hover:bg-[#fb169a]/10!'
        render={<a href='#' rel='noopener noreferrer' />}
        nativeButton={false}
      >
        <InstagramIcon className='stroke-[#fb169a]' />
        <span className='sr-only'>Instagram</span>
      </Button>
      <Button
        variant='outline'
        className='hover:bg-[#0866ff]/10!'
        render={<a href='#' rel='noopener noreferrer' />}
        nativeButton={false}
      >
        <FacebookIcon className='stroke-[#0866ff]' />
        <span className='sr-only'>Facebook</span>
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupSocialDemo
